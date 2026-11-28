/* =====================================================================
   tools/extras.js  -  version 5 data (by the ByteBusters team at Yewa College)
   ---------------------------------------------------------------------
   1. JAMB   popular courses and their usual UTME subjects
   2. SCHOLARSHIPS   long-running programmes linked to careers
   3. DAYS   "a day in the life": ILLUSTRATIVE first-person examples

   RULES FOR WRITERS (the tests check some of these)
   - JAMB: the subjects come from tools/careers.js, so one change updates
     every page. status "established" = the same in almost every
     university; "varies" = universities differ, so the page says
     "check" in big letters. Always send readers to the JAMB brochure.
   - SCHOLARSHIPS: only programmes we confirmed have run for several
     years (we searched on 28 Nov 2026). NEVER type a deadline or an
     amount: deadlines change every year, so the page says "check
     current dates". "official" is a link we saw quoted as the official
     page; "" means we could not confirm one, so the page says so.
   - DAYS: these are examples written by students to show what the work
     is like. They are NOT real people and must stay labelled
     "illustrative" until a real professional sends a story.
   ===================================================================== */
'use strict';

// Official JAMB links (jamb.gov.ng; IBASS is JAMB's brochure and eligibility system, as JAMB itself directs candidates)
const JAMB_LINKS = { site: 'https://www.jamb.gov.ng', ibass: 'https://ibass.jamb.gov.ng' };

// [course name, career slug in tools/careers.js, status, note]
const JAMB = [
  ['Medicine and Surgery', 'medical-doctor', 'established', ''],
  ['Dentistry', 'dentist', 'established', ''],
  ['Nursing Science', 'nurse', 'established', ''],
  ['Pharmacy', 'pharmacist', 'established', ''],
  ['Medical Laboratory Science', 'medical-laboratory-scientist', 'established', ''],
  ['Physiotherapy', 'physiotherapist', 'established', ''],
  ['Optometry', 'optometrist', 'established', ''],
  ['Radiography', 'radiographer', 'established', ''],
  ['Veterinary Medicine', 'veterinary-doctor', 'established', ''],
  ['Civil Engineering', 'civil-engineer', 'established', ''],
  ['Mechanical Engineering', 'mechanical-engineer', 'established', ''],
  ['Electrical / Electronic Engineering', 'electrical-engineer', 'established', ''],
  ['Chemical Engineering', 'chemical-engineer', 'established', ''],
  ['Petroleum Engineering', 'petroleum-engineer', 'established', ''],
  ['Accounting', 'accountant', 'established', 'The third subject is usually another Social Science or Commerce subject.'],
  ['Economics', 'economist', 'established', ''],
  ['Banking and Finance', 'banker', 'established', ''],
  ['Computer Science', 'software-developer', 'established', 'The third subject is usually Chemistry, Biology or another science; some universities accept Economics or Geography.'],
  ['Microbiology', 'microbiologist', 'established', ''],
  ['Biochemistry', 'biochemist', 'established', ''],
  ['Law', 'lawyer', 'varies', 'Most law faculties want Literature in English among the subjects or at least a credit in it at WAEC/NECO. Check the university.'],
  ['Mass Communication', 'journalist', 'varies', 'Many universities want Literature in English. Check the university.'],
  ['Architecture', 'architect', 'varies', 'Mathematics and Physics are usual; the third subject differs between universities.'],
  ['Quantity Surveying', 'quantity-surveyor', 'varies', ''],
  ['Estate Management', 'estate-surveyor', 'varies', ''],
  ['Cyber Security', 'cybersecurity-analyst', 'varies', 'A newer course: only some universities offer it, and their rules differ.'],
  ['Agriculture', 'agronomist', 'varies', ''],
  ['Food Science and Technology', 'food-scientist', 'varies', ''],
  ['Nutrition and Dietetics', 'nutritionist-dietitian', 'varies', ''],
  ['Geology', 'geologist', 'varies', ''],
  ['Statistics', 'statistician', 'varies', ''],
  ['Psychology', 'psychologist', 'varies', 'Some universities place Psychology in the Social Sciences, others in the Sciences, so the subjects differ.'],
  ['Social Work', 'social-worker', 'varies', ''],
  ['Education (teaching a subject)', 'teacher', 'varies', 'Depends on the subject you want to teach.']
];

// careers: list of career slugs, or a rule: 'uni' = every university career, 'tertiary' = university + polytechnic careers
const ENG = ['civil-engineer', 'mechanical-engineer', 'electrical-engineer', 'chemical-engineer', 'petroleum-engineer'];
const SCHOLARSHIPS = [
  { id: 'nnpc-totalenergies-nmss', name: 'NNPC Limited / TotalEnergies National Merit Scholarship Scheme (NMSS)', by: 'NNPC Limited and TotalEnergies in Nigeria',
    who: 'First-year and second-year full-time undergraduates in Nigerian universities. In past years it was open to any course of study.', level: 'University (100 or 200 level)',
    careers: 'uni', official: 'https://csr-ngscholarship.totalenergies.com', since: 'Runs every year; many past editions' },
  { id: 'nlng-ugss', name: 'NLNG Undergraduate Scholarship Scheme (UGSS)', by: 'Nigeria LNG Limited (NLNG)',
    who: 'First-year undergraduates in Nigerian universities. Eligible courses and rules are set in each year\'s advert.', level: 'University (100 level)',
    careers: 'uni', official: 'https://www.nigerialng.com', since: 'Editions reported from 2019 to 2025 and earlier' },
  { id: 'agbami-ameps', name: 'Agbami Medical and Engineering Professionals Scholarship (AMEPS)', by: 'Star Deep Water Petroleum Limited (a Chevron company) and its Agbami partners',
    who: 'Past adverts invited 200-level students in Medicine and Surgery, Dentistry, Pharmacy, Nursing, Medical Laboratory Science and Engineering, from any state.', level: 'University (200 level in past adverts)',
    careers: ['medical-doctor', 'dentist', 'pharmacist', 'nurse', 'medical-laboratory-scientist'].concat(ENG), official: '', since: 'Running since 2011' },
  { id: 'mtn-sts', name: 'MTN Foundation Science and Technology Scholarship (STS)', by: 'MTN Foundation',
    who: 'Students on science and technology courses in Nigerian public tertiary institutions (universities, polytechnics and colleges of education). Past adverts set a level and a grade to qualify.', level: 'Public university, polytechnic or college of education',
    careers: 'science', official: 'https://www.mtn.ng/scholarships', since: 'Running since 2010' },
  { id: 'mtn-sbs', name: 'MTN Foundation Scholarship for Blind Students (SBS)', by: 'MTN Foundation',
    who: 'Blind students in Nigerian public tertiary institutions.', level: 'Public university, polytechnic or college of education',
    careers: 'tertiary', official: 'https://www.mtn.ng/scholarships', since: 'Runs alongside the MTN STS' }
];
const SCHOLARSHIPS_CHECKED = '28 November 2026';

// [career slug, the work in one line, morning, middle of the day, end of the day, the hard part, the best part, subject I use most]
const DAYS = [
  ['nurse', 'I am a nurse on a children\'s ward in a general hospital.',
    'I arrive before 7:30, listen to the night nurse\'s handover, and check each child\'s temperature, medicine chart and drip.',
    'I give medicines on time, help the doctor on the ward round, and teach a mother how to give oral rehydration salts at home.',
    'I write my notes carefully so the next nurse knows everything, then hand over and go home tired but proud.',
    'Long hours on my feet, and staying calm when a child is very sick.', 'Seeing a child who came in weak walk out smiling with their parents.', 'Biology'],
  ['software-developer', 'I build apps for a small Nigerian technology company.',
    'I join a short team call, then read the message from a shop owner who says the app shows the wrong price.',
    'I find the mistake in the code, fix it, test it on a cheap phone, and ask a teammate to check my work.',
    'I write down what I changed and learn something new from a free online course for 30 minutes.',
    'Bugs can take hours to find, and the internet or power sometimes fails.', 'Watching real people use something I built.', 'Mathematics'],
  ['solar-installer', 'I install solar panels and batteries for homes and shops.',
    'My team loads panels, cables and tools, and we check the safety gear before we drive to a customer.',
    'We fix panels on the roof facing the sun, connect the batteries and inverter, and test every cable twice.',
    'I explain to the family how to use the system and how to keep the panels clean, then plan tomorrow\'s job.',
    'Working on hot roofs and carrying heavy batteries safely.', 'A shop that had no light now stays open in the evening.', 'Physics'],
  ['civil-engineer', 'I work on roads and drainage for a construction company.',
    'I visit the site, look at yesterday\'s work, and check that the drain is being built at the right slope.',
    'I meet the site supervisor, read the drawings, and test a concrete sample to make sure it is strong enough.',
    'Back in the office I update the report and the plan for the week.',
    'Rain can stop work, and every mistake costs money, so I must check carefully.', 'Driving on a road and knowing I helped build it.', 'Mathematics'],
  ['fashion-designer', 'I run a small fashion design shop.',
    'I open the shop, take a customer\'s measurements and draw the style she wants for her sister\'s wedding.',
    'I cut the fabric, guide my two apprentices on the sewing machines and fix a fitting for another customer.',
    'I post photos of finished work online, write down money in and money out, and plan fabric to buy.',
    'Customers who want everything urgently, and power cuts when the machine is running.', 'A customer trying on her outfit and loving it.', 'Mathematics (measurements and money)'],
  ['teacher', 'I teach Basic Science in a public secondary school.',
    'I prepare my lesson note and gather simple materials, like a bottle and water, for today\'s experiment.',
    'I teach three classes, ask questions so everyone takes part, and help a student who is struggling.',
    'I mark exercise books and plan tomorrow\'s lesson.',
    'Big classes and few materials, so I must be creative.', 'The moment a student says "Ah, now I understand!"', 'The subject I teach, and English to explain it'],
  ['agronomist', 'I advise farmers on how to grow better crops.',
    'I visit a maize farm early, look at the leaves for signs of pests or poor soil, and take soil samples.',
    'I show the farmers how to space their seeds and when to apply fertiliser, then test the soil samples.',
    'I write simple advice for the farmers\' group and share it on their WhatsApp group.',
    'Long trips on rough roads, and weather that changes plans.', 'A farmer telling me the harvest was bigger this year.', 'Biology and Chemistry'],
  ['medical-laboratory-scientist', 'I test samples in a hospital laboratory.',
    'I check that the machines are working and that every sample tube is labelled with the right patient code.',
    'I test blood and urine samples for malaria, blood sugar and other things the doctors asked for.',
    'I check my results twice, record them in the system and clean my work area.',
    'One wrong label could give someone the wrong result, so I can never rush.', 'Knowing my results help doctors treat the right illness.', 'Chemistry and Biology']
];

module.exports = { JAMB, JAMB_LINKS, SCHOLARSHIPS, SCHOLARSHIPS_CHECKED, DAYS };
