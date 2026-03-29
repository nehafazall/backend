import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { Sparkles, ChevronRight, ChevronLeft, Check, Globe, User, Brain } from "lucide-react";

const LANGUAGES = [
  { id: "english", label: "English", sample: "Hey! Let's get to know you better!" },
  { id: "hinglish", label: "Hinglish", sample: "Arre yaar! Chalo thoda jaante hain tumhe!" },
  { id: "manglish", label: "Manglish", sample: "Machane! Nammale parichayappedam!" },
];

const ClaretOnboardingModal = ({ userId, userName, onComplete }) => {
  const [step, setStep] = useState(0); // 0=intro, 1=mcq, 2=open, 3=done
  const [name, setName] = useState(userName?.split(" ")[0] || "");
  const [nickname, setNickname] = useState("");
  const [language, setLanguage] = useState("english");
  const [questions, setQuestions] = useState({ mcq: [], open: [] });
  const [mcqAnswers, setMcqAnswers] = useState([]);
  const [openAnswers, setOpenAnswers] = useState([]);
  const [mcqIndex, setMcqIndex] = useState(0);
  const [openIndex, setOpenIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [agreedTnC, setAgreedTnC] = useState(false);

  useEffect(() => {
    if (step === 1 && questions.mcq.length === 0) {
      fetchQuestions(language);
    }
  }, [step, language]);

  const fetchQuestions = async (lang) => {
    try {
      const res = await apiClient.get(`/claret/onboarding-questions?language=${lang}`);
      const q = res.data.questions || { mcq: [], open: [] };
      setQuestions(q);
      setMcqAnswers(new Array(q.mcq.length).fill(""));
      setOpenAnswers(new Array(q.open.length).fill(""));
      setMcqIndex(0);
      setOpenIndex(0);
    } catch {
      setQuestions({ mcq: [], open: [] });
    }
  };

  const handleLanguageSelect = (lang) => {
    setLanguage(lang);
    if (step === 1) fetchQuestions(lang);
  };

  const goToQuestions = () => {
    if (!name.trim()) return;
    fetchQuestions(language);
    setStep(1);
  };

  const handleMcqAnswer = (answer) => {
    const updated = [...mcqAnswers];
    updated[mcqIndex] = answer;
    setMcqAnswers(updated);
    // Auto-advance after a short delay
    setTimeout(() => {
      if (mcqIndex < questions.mcq.length - 1) {
        setMcqIndex(mcqIndex + 1);
      } else {
        setStep(2); // Move to open questions
      }
    }, 300);
  };

  const handleOpenNext = () => {
    if (openIndex < questions.open.length - 1) {
      setOpenIndex(openIndex + 1);
    } else {
      handleSave();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.post("/claret/profile", {
        user_id: userId,
        name,
        nickname: nickname || name,
        language,
        answers: { mcq: mcqAnswers, open: openAnswers },
        motivation_frequency: "sometimes",
      });
      setStep(3);
      setTimeout(() => onComplete(), 2000);
    } catch {
      setSaving(false);
    }
  };

  const totalSteps = 1 + questions.mcq.length + questions.open.length;
  const currentStep = step === 0 ? 0 : step === 1 ? 1 + mcqIndex : step === 2 ? 1 + questions.mcq.length + openIndex : totalSteps;
  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" data-testid="claret-onboarding-modal">
      <div className="w-[420px] max-h-[90vh] bg-background rounded-2xl shadow-2xl border overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">Meet Claret</h2>
              <p className="text-xs text-white/70">Your personal AI buddy at CLT</p>
            </div>
          </div>
          {/* Progress bar */}
          {step > 0 && step < 3 && (
            <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white/80 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Step 0: Intro — Name, Nickname, Language */}
          {step === 0 && (
            <div className="space-y-5" data-testid="onboarding-step-intro">
              <p className="text-sm text-muted-foreground">
                Let's personalize your experience! I'll learn how you think and talk so I can be the best buddy for you.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Your Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="What should I call you?"
                    data-testid="onboarding-name"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Nickname (optional)</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Any fun name you go by?"
                    data-testid="onboarding-nickname"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Language Preference
                </label>
                <div className="space-y-2">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.id}
                      onClick={() => handleLanguageSelect(lang.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${
                        language === lang.id
                          ? "border-indigo-500 bg-indigo-500/5"
                          : "border-transparent bg-muted/50 hover:bg-muted"
                      }`}
                      data-testid={`lang-${lang.id}`}
                    >
                      <span className="font-medium">{lang.label}</span>
                      <p className="text-xs text-muted-foreground mt-0.5 italic">"{lang.sample}"</p>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={goToQuestions}
                disabled={!name.trim()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-sm hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                data-testid="onboarding-next"
              >
                Let's Go <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 1: MCQ Questions — one at a time */}
          {step === 1 && questions.mcq.length > 0 && (
            <div className="space-y-4" data-testid="onboarding-step-mcq">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Brain className="w-3.5 h-3.5" /> Question {mcqIndex + 1} of {questions.mcq.length}
                </span>
                {mcqIndex > 0 && (
                  <button onClick={() => setMcqIndex(mcqIndex - 1)} className="text-xs text-indigo-600 flex items-center gap-0.5">
                    <ChevronLeft className="w-3 h-3" /> Back
                  </button>
                )}
              </div>

              <p className="text-sm font-medium leading-relaxed">{questions.mcq[mcqIndex]?.q}</p>

              <div className="space-y-2">
                {questions.mcq[mcqIndex]?.options?.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleMcqAnswer(opt)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all ${
                      mcqAnswers[mcqIndex] === opt
                        ? "border-indigo-500 bg-indigo-500/10 font-medium"
                        : "border-transparent bg-muted/50 hover:bg-muted hover:border-border"
                    }`}
                    data-testid={`mcq-option-${i}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Open-ended Questions — one at a time */}
          {step === 2 && questions.open.length > 0 && (
            <div className="space-y-4" data-testid="onboarding-step-open">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Almost done! {openIndex + 1} of {questions.open.length}
                </span>
                <button
                  onClick={() => openIndex > 0 ? setOpenIndex(openIndex - 1) : setStep(1)}
                  className="text-xs text-indigo-600 flex items-center gap-0.5"
                >
                  <ChevronLeft className="w-3 h-3" /> Back
                </button>
              </div>

              <p className="text-sm font-medium leading-relaxed">{questions.open[openIndex]?.q}</p>

              <textarea
                value={openAnswers[openIndex] || ""}
                onChange={e => {
                  const updated = [...openAnswers];
                  updated[openIndex] = e.target.value;
                  setOpenAnswers(updated);
                }}
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                placeholder="Share your thoughts..."
                data-testid="open-answer-input"
              />

              {/* T&C checkbox - show on last question */}
              {openIndex === questions.open.length - 1 && (
                <label className="flex items-start gap-2 cursor-pointer text-xs text-muted-foreground" data-testid="tnc-checkbox-label">
                  <input
                    type="checkbox"
                    checked={agreedTnC}
                    onChange={e => setAgreedTnC(e.target.checked)}
                    className="mt-0.5 rounded border-border"
                    data-testid="tnc-checkbox"
                  />
                  <span>
                    I agree that my responses and conversations with Claret may be stored securely and used to personalize my experience. This data is handled confidentially by the organization.
                  </span>
                </label>
              )}

              <button
                onClick={handleOpenNext}
                disabled={saving || (openIndex === questions.open.length - 1 && !agreedTnC)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-sm hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                data-testid="onboarding-open-next"
              >
                {saving ? "Saving..." : openIndex < questions.open.length - 1 ? (
                  <>Next <ChevronRight className="w-4 h-4" /></>
                ) : (
                  <>Finish <Check className="w-4 h-4" /></>
                )}
              </button>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <div className="text-center py-8 space-y-3" data-testid="onboarding-complete">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold">All set, {nickname || name}!</h3>
              <p className="text-sm text-muted-foreground">
                {language === "hinglish" ? "Ab main tumhare style mein baat karunga! Ready ho?" :
                 language === "manglish" ? "Ini njan ningalude style-il samsaarikaam! Ready aano?" :
                 "I'll now talk in your style! Ready to chat?"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClaretOnboardingModal;
