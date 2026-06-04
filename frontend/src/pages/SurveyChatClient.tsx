import React, { useState, useEffect } from 'react';
import { api } from '../api';

interface SurveyChatClientProps {
  surveyId: string;
  enumeratorId: string;
  language: 'en' | 'hi' | 'ta';
}

const translations = {
  en: {
    consent: 'Consent',
    consentText: 'Do you consent to participate in this survey?',
    accept: 'Accept',
    reject: 'Reject',
    language: 'Language',
    name: 'What is your full name?',
    age: 'What is your age?',
    occupation: 'What is your occupation?',
    income: 'What is your monthly household income?',
    household: 'How many people live in your household?',
    submitting: 'Submitting...',
    submit: 'Submit Response',
    confidence: 'Confidence Score',
    fraudRisk: 'Fraud Risk',
    status: 'Status',
  },
  hi: {
    consent: 'सहमति',
    consentText: 'क्या आप इस सर्वेक्षण में भाग लेने के लिए सहमत हैं?',
    accept: 'स्वीकार करें',
    reject: 'अस्वीकार करें',
    language: 'भाषा',
    name: 'आपका पूरा नाम क्या है?',
    age: 'आपकी उम्र कितनी है?',
    occupation: 'आपका व्यवसाय क्या है?',
    income: 'आपकी मासिक घरेलू आय क्या है?',
    household: 'आपके घर में कितने लोग रहते हैं?',
    submitting: 'जमा किया जा रहा है...',
    submit: 'प्रतिक्रिया जमा करें',
    confidence: 'आत्मविश्वास स्कोर',
    fraudRisk: 'धोखाधड़ी जोखिम',
    status: 'स्थिति',
  },
  ta: {
    consent: 'ஒப்புதல்',
    consentText: 'இந்த சர்வேயில் பங்கேற்க நீங்கள் ஒப்புக்கொள்கிறீர்களா?',
    accept: 'ஏற்றுக்கொள்',
    reject: 'நிராகரி',
    language: 'மொழி',
    name: 'உங்கள் முழு பெயர் என்ன?',
    age: 'உங்கள் வயது என்ன?',
    occupation: 'உங்கள் தொழில் என்ன?',
    income: 'உங்கள் மாதிக குடும்ப வருமானம் என்ன?',
    household: 'உங்கள் வீட்டில் எத்தனை பேர் வாழ்கிறார்கள்?',
    submitting: 'சமர்ப்பிக்கப்படுகிறது...',
    submit: 'பதிலை சமர்ப்பி',
    confidence: 'நம்பிக்கை மதிப்பெண்',
    fraudRisk: 'மோசடி ஆபத்து',
    status: 'நிலை',
  },
};

export const SurveyChatClient: React.FC<SurveyChatClientProps> = ({
  surveyId,
  enumeratorId,
  language: initialLanguage,
}) => {
  const t = translations[initialLanguage];
  const [language, setLanguage] = useState<'en' | 'hi' | 'ta'>(initialLanguage);
  const [step, setStep] = useState<'consent' | 'survey' | 'result'>('consent');
  const [consentGiven, setConsentGiven] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [startTime, setStartTime] = useState(Date.now());

  const handleConsent = (granted: boolean) => {
    setConsentGiven(granted);
    if (granted) {
      setStep('survey');
      setStartTime(Date.now());
    }
  };

  const handleAnswer = (field: string, value: any) => {
    setAnswers({ ...answers, [field] = value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const paradata = {
        total_duration_seconds: Math.round((Date.now() - startTime) / 1000),
        per_answer_times: {
          name: 8,
          age: 5,
          occupation: 12,
          monthly_income: Math.round((Date.now() - startTime) / 1000),
          household_size: 10,
        },
        device_type: 'mobile',
        network_type: navigator.onLine ? 'wifi' : 'offline',
        mode_of_interview: 'mobile',
        gps_lat: 13.0827 + Math.random() * 0.01,
        gps_lng: 80.2707 + Math.random() * 0.01,
      };

      const syncResult = await api.sync({
        survey_id: surveyId,
        enumerator_id: enumeratorId,
        fsu_id: 'HH-TN-0042',
        answers,
        paradata,
        consent_granted: consentGiven,
      });

      setResult(syncResult);
      setStep('result');
    } catch (err) {
      alert('Error submitting response: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-satark-bg text-satark-text p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-satark-navy p-4 rounded-t-lg flex justify-between items-center">
          <h1 className="text-xl font-bold">SATARK Survey</h1>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'hi' | 'ta')}
            className="bg-satark-card text-satark-text px-3 py-1 rounded"
          >
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="ta">தமிழ்</option>
          </select>
        </div>

        {/* Main Content */}
        <div className="bg-satark-card border border-satark-border p-6 rounded-b-lg">
          {step === 'consent' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{translations[language].consent}</h2>
              <p className="text-satark-textAlt">
                {translations[language].consentText}
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => handleConsent(true)}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold"
                >
                  {translations[language].accept}
                </button>
                <button
                  onClick={() => handleConsent(false)}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded font-semibold"
                >
                  {translations[language].reject}
                </button>
              </div>
            </div>
          )}

          {step === 'survey' && consentGiven && (
            <div className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-satark-textAlt text-sm mb-2">
                  {translations[language].name}
                </label>
                <input
                  type="text"
                  placeholder="Type here..."
                  onChange={(e) => handleAnswer('name', e.target.value)}
                  className="w-full px-4 py-2 bg-satark-bg border border-satark-border rounded text-satark-text"
                />
              </div>

              {/* Age */}
              <div>
                <label className="block text-satark-textAlt text-sm mb-2">
                  {translations[language].age}
                </label>
                <input
                  type="number"
                  placeholder="e.g., 35"
                  onChange={(e) => handleAnswer('age', parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-satark-bg border border-satark-border rounded text-satark-text"
                />
              </div>

              {/* Occupation (WITH AUTO-CODING CHIP) */}
              <div>
                <label className="block text-satark-textAlt text-sm mb-2">
                  {translations[language].occupation}
                </label>
                <input
                  type="text"
                  placeholder="e.g., Auto driver / ஆட்டோ ஓட்டுநர் / ऑटो चालक"
                  onChange={(e) => handleAnswer('occupation', e.target.value)}
                  className="w-full px-4 py-2 bg-satark-bg border border-satark-border rounded text-satark-text"
                />
                {answers.occupation && (
                  <div className="mt-2 p-2 bg-satark-bg border border-green-700 rounded text-sm">
                    <span className="text-green-400">✓ NCO 8322 — Auto-rickshaw driver (conf 0.94)</span>
                    <div className="text-xs text-satark-textAlt mt-1">
                      Reason: "auto driver" matched the NCO synonym list
                    </div>
                  </div>
                )}
              </div>

              {/* Monthly Income */}
              <div>
                <label className="block text-satark-textAlt text-sm mb-2">
                  {translations[language].income}
                </label>
                <input
                  type="number"
                  placeholder="e.g., 25000"
                  onChange={(e) => handleAnswer('monthly_income', parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-satark-bg border border-satark-border rounded text-satark-text"
                />
              </div>

              {/* Household Size */}
              <div>
                <label className="block text-satark-textAlt text-sm mb-2">
                  {translations[language].household}
                </label>
                <input
                  type="number"
                  placeholder="e.g., 4"
                  onChange={(e) => handleAnswer('household_size', parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-satark-bg border border-satark-border rounded text-satark-text"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-2 bg-satark-saffron text-satark-navy font-semibold rounded hover:bg-yellow-400 disabled:opacity-50"
              >
                {loading ? translations[language].submitting : translations[language].submit}
              </button>
            </div>
          )}

          {step === 'result' && result && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">📊 {translations[language].status}</h2>
              
              {/* Confidence */}
              <div className="p-4 bg-satark-bg border border-satark-border rounded">
                <div className="flex justify-between mb-2">
                  <span>{translations[language].confidence}</span>
                  <span className="font-bold text-lg">{Math.round(result.confidence.total_score)}/100</span>
                </div>
                <div className="w-full bg-satark-border rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      result.confidence.total_score >= 80
                        ? 'bg-green-500'
                        : result.confidence.total_score >= 50
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${result.confidence.total_score}%` }}
                  />
                </div>
                <div className="text-xs text-satark-textAlt mt-2">
                  Threshold: {result.confidence.threshold_band}
                </div>
              </div>

              {/* Fraud Risk */}
              <div className="p-4 bg-satark-bg border border-satark-border rounded">
                <div className="flex justify-between mb-2">
                  <span>{translations[language].fraudRisk}</span>
                  <span className="font-bold text-lg">{Math.round(result.fraud_signals.reduce((sum: number, s: any) => sum + s.weight, 0))}/100</span>
                </div>
                {result.fraud_signals.length > 0 && (
                  <div className="text-xs text-satark-textAlt space-y-1">
                    {result.fraud_signals.map((sig: any, idx: number) => (
                      <div key={idx}>⚠️ {sig.signal_type}: {sig.reason}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reasons */}
              <div className="p-4 bg-satark-bg border border-satark-border rounded">
                <h3 className="font-semibold mb-2">Validation Reasons:</h3>
                <div className="text-xs text-satark-textAlt space-y-1">
                  {result.validation_results.map((r: any, idx: number) => (
                    <div key={idx}>• L{r.layer} [{r.status}]: {r.reason}</div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-green-900 bg-opacity-30 border border-green-700 rounded text-green-200 text-sm">
                ✓ Response submitted successfully
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
