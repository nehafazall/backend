#!/usr/bin/env python3
"""Process CS upgrade data CSV and import into database"""
import os, sys, csv, io, re, uuid, urllib.request
from datetime import datetime, timezone
from pymongo import MongoClient

MONGO_URL = os.environ.get('MONGO_URL', '')
DB_NAME = os.environ.get('DB_NAME', '')

# Read from .env if not in env
if not MONGO_URL:
    with open('/app/backend/.env') as f:
        for line in f:
            if line.startswith('MONGO_URL='):
                MONGO_URL = line.split('=', 1)[1].strip().strip('"')
            elif line.startswith('DB_NAME='):
                DB_NAME = line.split('=', 1)[1].strip().strip('"')

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

CSV_URL = "https://customer-assets.emergentagent.com/job_43fd76d8-7ea0-42b2-916a-9f8274883606/artifacts/nx6d4fob_CLT-%20Upgrade%20data%20.csv"

def clean_email(email):
    """Fix common email issues"""
    email = email.strip().strip('"').strip("'").lstrip(':').strip()
    email = email.replace(',com', '.com')
    email = email.rstrip('"')
    return email.lower()

def clean_amount(amount_str):
    """Parse AED2,105.00 format to float"""
    s = amount_str.strip().strip('"').strip()
    s = re.sub(r'^AED\s*', '', s)
    s = s.replace(',', '')
    s = s.strip()
    return float(s)

def clean_date(date_str, month_str):
    """Convert DD/MM/YYYY to YYYY-MM-DD"""
    try:
        dt = datetime.strptime(date_str.strip(), '%d/%m/%Y')
        return dt.strftime('%Y-%m-%d')
    except:
        # Fallback to month + day 1
        return f"{month_str}-01"

def main():
    print("=" * 60)
    print("CS UPGRADE DATA IMPORT")
    print("=" * 60)
    
    # Download and parse CSV
    resp = urllib.request.urlopen(CSV_URL)
    raw = resp.read().decode('utf-8-sig')
    reader = csv.DictReader(io.StringIO(raw))
    rows = list(reader)
    print(f"\nTotal rows in CSV: {len(rows)}")
    
    # Load CS agents
    agent_ids = set()
    for row in rows:
        agent_ids.add(row.get('cs_employee_id*', '').strip())
    
    agents = {}
    for eid in agent_ids:
        emp = db.hr_employees.find_one({'employee_id': eid})
        if emp:
            user = db.users.find_one({'id': emp.get('user_id')})
            if user:
                agents[eid] = {
                    'user_id': user['id'],
                    'full_name': user['full_name'],
                    'employee_id': eid
                }
                print(f"  Agent {eid}: {user['full_name']}")
            else:
                print(f"  Agent {eid}: Employee found but NO USER ACCOUNT")
        else:
            print(f"  Agent {eid}: NOT FOUND")
    
    now = datetime.now(timezone.utc).isoformat()
    
    stats = {
        'total': len(rows),
        'processed': 0,
        'new_students_created': 0,
        'upgrades_recorded': 0,
        'customer_master_updated': 0,
        'errors': [],
        'agent_stats': {},  # agent_id -> {upgrades, revenue}
    }
    
    for i, row in enumerate(rows):
        try:
            eid = row.get('cs_employee_id*', '').strip()
            email_raw = row.get('student_email*', '').strip()
            amount_raw = row.get('upgrade_amount*', '').strip()
            course_level = row.get('upgrade_to_course', '').strip()
            month = row.get('month*', '').strip()
            date_raw = row.get('date*', '').strip()
            
            email = clean_email(email_raw)
            amount = clean_amount(amount_raw)
            date = clean_date(date_raw, month)
            
            if not email or not amount or eid not in agents:
                stats['errors'].append(f"Row {i+1}: Missing data (email={email}, amount={amount}, agent={eid})")
                continue
            
            agent = agents[eid]
            
            # Find or create student
            student = db.students.find_one({'email': {'$regex': f'^{re.escape(email)}$', '$options': 'i'}})
            
            if not student:
                # Create new student
                student_id = str(uuid.uuid4())
                student = {
                    'id': student_id,
                    'full_name': email.split('@')[0].replace('.', ' ').replace('_', ' ').title(),
                    'email': email,
                    'phone': '',
                    'country': '',
                    'city': '',
                    'stage': 'activated',
                    'mentor_stage': 'new_student',
                    'cs_agent_id': agent['user_id'],
                    'cs_agent_name': agent['full_name'],
                    'onboarding_complete': True,
                    'classes_attended': 0,
                    'upgrade_eligible': False,
                    'upgrade_pitched': False,
                    'upgrade_closed': True,
                    'is_upgraded_student': True,
                    'is_new_from_import': True,  # Flag for distinct card color
                    'course_level': course_level.capitalize() if course_level else 'Starter',
                    'current_course_name': course_level,
                    'upgrade_count': 0,
                    'total_upgrades': 0,
                    'ltv': 0,
                    'upgrade_history': [],
                    'sla_status': 'ok',
                    'created_at': f"{date}T00:00:00+00:00",
                    'updated_at': now,
                    'package_bought': course_level,
                }
                db.students.insert_one(student)
                student.pop('_id', None)
                stats['new_students_created'] += 1
                print(f"  [{i+1}] NEW STUDENT: {email} -> {course_level}")
            
            # Record upgrade transaction
            upgrade_id = str(uuid.uuid4())
            previous_level = student.get('course_level', 'Starter')
            previous_course = student.get('current_course_name', '')
            
            db.cs_upgrades.insert_one({
                'id': upgrade_id,
                'month': month,
                'date': date,
                'cs_agent_id': agent['user_id'],
                'cs_agent_name': agent['full_name'],
                'cs_employee_id': eid,
                'student_id': student['id'],
                'student_name': student['full_name'],
                'student_email': email,
                'amount': amount,
                'upgrade_to_course': course_level,
                'course_level': course_level.capitalize() if course_level else None,
                'previous_course': previous_course,
                'previous_level': previous_level,
                'created_at': f"{date}T00:00:00+00:00",
                'imported_at': now,
                'created_by': 'system_import'
            })
            
            # Update student record
            update_level = course_level.capitalize() if course_level else None
            update_fields = {
                'is_upgraded_student': True,
                'last_upgrade_at': date,
                'last_upgrade_amount': amount,
                'updated_at': now,
                'upgrade_closed': True,
            }
            if update_level:
                update_fields['course_level'] = update_level
                update_fields['current_course_name'] = course_level
            
            db.students.update_one(
                {'id': student['id']},
                {
                    '$set': update_fields,
                    '$inc': {
                        'upgrade_count': 1,
                        'total_upgrades': amount,
                        'ltv': amount,
                    },
                    '$push': {
                        'upgrade_history': {
                            'id': upgrade_id,
                            'from_course': previous_course,
                            'from_level': previous_level,
                            'to_course': course_level,
                            'to_level': update_level,
                            'amount': amount,
                            'date': date,
                            'month': month,
                            'cs_agent_id': agent['user_id'],
                            'cs_agent_name': agent['full_name'],
                            'upgraded_at': f"{date}T00:00:00+00:00",
                        }
                    }
                }
            )
            
            # Update Customer Master
            customer = db.customers.find_one({'email': {'$regex': f'^{re.escape(email)}$', '$options': 'i'}})
            if customer:
                db.customers.update_one(
                    {'id': customer['id']},
                    {
                        '$inc': {'ltv': amount, 'total_payments': amount},
                        '$set': {'updated_at': now, 'last_upgrade_at': date, 'course_level': update_level},
                        '$push': {
                            'transactions': {
                                'id': upgrade_id,
                                'type': 'upgrade',
                                'amount': amount,
                                'date': date,
                                'month': month,
                                'course': course_level,
                                'cs_agent': agent['full_name'],
                            }
                        }
                    }
                )
                stats['customer_master_updated'] += 1
            else:
                # Create customer record
                db.customers.insert_one({
                    'id': str(uuid.uuid4()),
                    'full_name': student.get('full_name', email.split('@')[0].title()),
                    'email': email,
                    'phone': student.get('phone', ''),
                    'country': student.get('country', ''),
                    'package_bought': course_level,
                    'course_level': update_level,
                    'ltv': amount,
                    'total_payments': amount,
                    'last_upgrade_at': date,
                    'transactions': [{
                        'id': upgrade_id,
                        'type': 'upgrade',
                        'amount': amount,
                        'date': date,
                        'month': month,
                        'course': course_level,
                        'cs_agent': agent['full_name'],
                    }],
                    'created_at': f"{date}T00:00:00+00:00",
                    'updated_at': now,
                })
                stats['customer_master_updated'] += 1
            
            # Track agent stats
            if eid not in stats['agent_stats']:
                stats['agent_stats'][eid] = {'name': agent['full_name'], 'upgrades': 0, 'revenue': 0}
            stats['agent_stats'][eid]['upgrades'] += 1
            stats['agent_stats'][eid]['revenue'] += amount
            
            stats['upgrades_recorded'] += 1
            stats['processed'] += 1
            
        except Exception as e:
            stats['errors'].append(f"Row {i+1}: {str(e)}")
    
    # Create LTV transaction records for each upgrade
    print("\n" + "=" * 60)
    print("IMPORT RESULTS")
    print("=" * 60)
    print(f"Total rows: {stats['total']}")
    print(f"Processed: {stats['processed']}")
    print(f"New students created: {stats['new_students_created']}")
    print(f"Upgrades recorded: {stats['upgrades_recorded']}")
    print(f"Customer Master updated: {stats['customer_master_updated']}")
    print(f"Errors: {len(stats['errors'])}")
    for e in stats['errors'][:10]:
        print(f"  - {e}")
    
    print(f"\n--- Agent Leaderboard ---")
    for eid, data in sorted(stats['agent_stats'].items(), key=lambda x: x[1]['revenue'], reverse=True):
        print(f"  {data['name']} ({eid}): {data['upgrades']} upgrades, AED {data['revenue']:,.0f}")
    
    # Verify multi-transaction students
    print(f"\n--- Students with Multiple Transactions ---")
    multi = list(db.students.find(
        {'upgrade_count': {'$gt': 1}},
        {'_id': 0, 'full_name': 1, 'email': 1, 'upgrade_count': 1, 'ltv': 1, 'course_level': 1}
    ).sort('upgrade_count', -1).limit(15))
    for s in multi:
        print(f"  {s['email']}: {s['upgrade_count']} upgrades, LTV: AED {s.get('ltv', 0):,.0f}, Level: {s.get('course_level', '?')}")

if __name__ == '__main__':
    main()
