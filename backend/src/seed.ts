/**
 * Seed data for SATARK MVP
 * Classification codes, prepopulation, enumerators, demo survey
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedClassificationCodes() {
  console.log('Seeding classification codes (NCO, NIC, ISIC)...');

  const codes = [
    // NCO codes
    {
      system: 'NCO',
      code: '8322',
      label: 'Auto-rickshaw / three-wheeler driver',
      synonyms: [
        'auto driver',
        'auto',
        'autorickshaw',
        'ऑटो चालक',
        'ஆட்டோ ஓட்டுநர்',
        'auto van driver',
      ],
    },
    {
      system: 'NCO',
      code: '6111',
      label: 'Farmer / crop grower',
      synonyms: [
        'farmer',
        'vivasayi',
        'விவசாயி',
        'किसान',
        'crop farmer',
        'agriculture worker',
      ],
    },
    {
      system: 'NCO',
      code: '2511',
      label: 'Software developer',
      synonyms: [
        'software engineer',
        'developer',
        'programmer',
        'सॉफ्टवेयर इंजीनियर',
        'மென்பொருள் பொறியியலாளர்',
        'coder',
      ],
    },
    {
      system: 'NCO',
      code: '5149',
      label: 'Shop sales worker',
      synonyms: ['shopkeeper', 'retail worker', 'दुकानदार', 'கடை உரிமையாளர்'],
    },
    // NIC codes
    {
      system: 'NIC',
      code: '4923',
      label: 'Freight road transport',
      synonyms: ['lorry', 'truck transport', 'goods transport', 'ट्रक', 'கொட்ടம்'],
    },
    {
      system: 'NIC',
      code: '0111',
      label: 'Cereals',
      synonyms: ['paddy', 'rice farming', 'wheat', 'धान', 'அரிசி'],
    },
    // ISIC codes
    {
      system: 'ISIC',
      code: '7420',
      label: 'Management consultancy activities',
      synonyms: ['consulting', 'management consultant', 'सलाह', 'ஆலோசனை'],
    },
  ];

  for (const code of codes) {
    await supabase.from('classification_codes').upsert([code], {
      onConflict: 'system,code',
    });
  }

  console.log(`✓ Seeded ${codes.length} classification codes`);
}

async function seedPrepopulation() {
  console.log('Seeding prepopulation sources...');

  const sources = [
    {
      identifier_type: 'household_id',
      identifier_value: 'HH-TN-0042',
      known_fields: {
        name: 'Lakshmi R',
        state: 'Tamil Nadu',
        district: 'Chennai',
        region_id: 'TN-CH',
      },
      source: 'prior round',
    },
    {
      identifier_type: 'household_id',
      identifier_value: 'HH-TN-0088',
      known_fields: {
        name: 'Vijay Kumar',
        state: 'Tamil Nadu',
        district: 'Coimbatore',
        region_id: 'TN-CB',
      },
      source: 'prior round',
    },
  ];

  for (const source of sources) {
    await supabase.from('prepopulation_sources').upsert([source], {
      onConflict: 'identifier_type,identifier_value',
    });
  }

  console.log(`✓ Seeded ${sources.length} prepopulation sources`);
}

async function seedReferenceDistributions() {
  console.log('Seeding reference distributions...');

  const dists = [
    {
      region_id: 'TN-CH',
      field_key: 'monthly_income',
      median: 22000,
      p05: 6000,
      p95: 80000,
    },
    {
      region_id: 'TN-CH',
      field_key: 'response_time_seconds',
      median: 90,
      p05: 30,
      p95: 300,
    },
    {
      region_id: 'TN-CB',
      field_key: 'monthly_income',
      median: 20000,
      p05: 5000,
      p95: 75000,
    },
  ];

  for (const dist of dists) {
    await supabase.from('reference_distributions').insert([dist]);
  }

  console.log(`✓ Seeded ${dists.length} reference distributions`);
}

async function seedEnumerators() {
  console.log('Seeding enumerators...');

  const enums = [
    {
      name: 'Lakshmi R',
      phone: '+91-98765-43210',
      device_fingerprint: 'device_abc123',
      region_id: 'TN-CH',
      trust_score: 92,
      responses_count: 15,
      flagged_count: 0,
    },
    {
      name: 'Suspect',
      phone: '+91-87654-32109',
      device_fingerprint: 'device_xyz789',
      region_id: 'TN-CH',
      trust_score: 45,
      responses_count: 8,
      flagged_count: 3,
    },
  ];

  for (const en of enums) {
    await supabase.from('enumerators').insert([en]);
  }

  console.log(`✓ Seeded ${enums.length} enumerators`);
}

async function seedQuestionBank() {
  console.log('Seeding question bank...');

  const questions = [
    {
      text_en: 'What is your full name?',
      text_hi: 'आपका पूरा नाम क्या है?',
      text_ta: 'உங்கள் முழு பெயர் என்ன?',
      type: 'text',
      domain: 'demographics',
      validation_rule: { mandatory: true },
    },
    {
      text_en: 'What is your age?',
      text_hi: 'आपकी उम्र कितनी है?',
      text_ta: 'உங்கள் வயது என்ன?',
      type: 'number',
      domain: 'demographics',
      validation_rule: { min: 18, max: 95, mandatory: true },
    },
    {
      text_en: 'What is your occupation?',
      text_hi: 'आपका व्यवसाय क्या है?',
      text_ta: 'உங்கள் தொழில் என்ன?',
      type: 'text',
      domain: 'employment',
      code_binding: 'NCO',
      validation_rule: { mandatory: true },
    },
    {
      text_en: 'What is your monthly household income?',
      text_hi: 'आपकी मासिक घरेलू आय क्या है?',
      text_ta: 'உங்கள் மாதிక குடும்ப வருமானம் என்ன?',
      type: 'number',
      domain: 'economic',
      validation_rule: { min: 0, mandatory: true },
    },
    {
      text_en: 'How many people live in your household?',
      text_hi: 'आपके घर में कितने लोग रहते हैं?',
      text_ta: 'உங்கள் வீட்டில் எத்தனை பேர் வாழ்கிறார்கள்?',
      type: 'number',
      domain: 'demographics',
      validation_rule: { min: 1, max: 20, mandatory: true },
    },
  ];

  for (const q of questions) {
    await supabase.from('question_bank').insert([q]);
  }

  console.log(`✓ Seeded ${questions.length} questions`);
}

async function seedDemoSurvey() {
  console.log('Seeding demo survey...');

  const surveyGraph = {
    nodes: [
      { id: 'start', label: 'Consent & Demographics' },
      { id: 'q1', label: 'Name', question_id: null },
      { id: 'q2', label: 'Age', question_id: null },
      { id: 'q3', label: 'Occupation', question_id: null },
      { id: 'q3_student', label: 'Institution (Student)', condition: 'q3 == "Student"' },
      { id: 'q3_unemployed', label: 'Duration Unemployed', condition: 'q3 == "Unemployed"' },
      { id: 'q3_employed', label: 'Employer/Business', condition: 'q3 != "Student" && q3 != "Unemployed"' },
      { id: 'q4', label: 'Monthly Income', question_id: null },
      { id: 'q5', label: 'Household Size', question_id: null },
      { id: 'end', label: 'Thank you!' },
    ],
    edges: [
      { from: 'start', to: 'q1' },
      { from: 'q1', to: 'q2' },
      { from: 'q2', to: 'q3' },
      { from: 'q3', to: 'q3_student', condition: 'occupation == "Student"' },
      { from: 'q3', to: 'q3_unemployed', condition: 'occupation == "Unemployed"' },
      { from: 'q3', to: 'q3_employed', condition: 'true' },
      { from: 'q3_student', to: 'q4' },
      { from: 'q3_unemployed', to: 'q4' },
      { from: 'q3_employed', to: 'q4' },
      { from: 'q4', to: 'q5' },
      { from: 'q5', to: 'end' },
    ],
  };

  const validationRules = {
    name: { mandatory: true },
    age: { min: 18, max: 95, mandatory: true },
    occupation: { mandatory: true },
    monthly_income: { min: 0, mandatory: true },
    household_size: { min: 1, max: 20, mandatory: true },
  };

  await supabase.from('surveys').insert([
    {
      name: 'Household Employment Survey',
      version: 1,
      question_graph: surveyGraph,
      validation_rules: validationRules,
      status: 'published',
    },
  ]);

  console.log('✓ Seeded demo survey');
}

async function seedDemoResponses() {
  console.log('Seeding demo responses for visualization...');

  // Get enumerators
  const { data: enumerators } = await supabase
    .from('enumerators')
    .select('id')
    .limit(2);

  // Get survey
  const { data: surveys } = await supabase
    .from('surveys')
    .select('id')
    .limit(1);

  if (!enumerators || !surveys) return;

  const [lakshmiId, suspectId] = enumerators.map((e) => e.id);
  const surveyId = surveys[0].id;

  // Good response from Lakshmi
  await supabase.from('responses').insert([
    {
      survey_id: surveyId,
      enumerator_id: lakshmiId,
      answers: {
        name: 'Lakshmi R',
        age: 35,
        occupation: 'Auto driver',
        monthly_income: 25000,
        household_size: 4,
      },
      paradata: {
        total_duration_seconds: 87,
        per_answer_times: { name: 8, age: 5, occupation: 12, monthly_income: 35, household_size: 27 },
        device_type: 'mobile',
        network_type: 'wifi',
        mode_of_interview: 'mobile',
        gps_lat: 13.0827,
        gps_lng: 80.2707,
      },
      confidence_score: 92,
      fraud_risk_score: 5,
      status: 'approved',
    },
  ]);

  // Flagged response from Suspect (fast + unemployed + high income = fraud signal)
  await supabase.from('responses').insert([
    {
      survey_id: surveyId,
      enumerator_id: suspectId,
      answers: {
        name: 'Test Respondent',
        age: 28,
        occupation: 'Unemployed',
        monthly_income: 200000,
        household_size: 3,
      },
      paradata: {
        total_duration_seconds: 4,
        per_answer_times: { name: 1, age: 0.5, occupation: 0.8, monthly_income: 1, household_size: 0.7 },
        device_type: 'mobile',
        network_type: 'mobile',
        mode_of_interview: 'mobile',
        gps_lat: 13.0827,
        gps_lng: 80.2707,
      },
      confidence_score: 38,
      fraud_risk_score: 72,
      status: 'flagged',
    },
  ]);

  console.log('✓ Seeded demo responses');
}

export async function seed() {
  try {
    console.log('Starting seed...\n');
    await seedClassificationCodes();
    await seedPrepopulation();
    await seedReferenceDistributions();
    await seedEnumerators();
    await seedQuestionBank();
    await seedDemoSurvey();
    await seedDemoResponses();
    console.log('\n✓ Seed complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed();
}
