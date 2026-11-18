import { BookOpen, BriefcaseBusiness, GraduationCap, Layers } from 'lucide-react'
import type { SchemeGoal, SchemeProfileType } from './schemeStore'

export type SelectableProfileType = Exclude<SchemeProfileType, 'unset'>

export interface RecommendedSchemePreview {
  id: 'pmegp' | 'mudra' | 'csss' | 'nmmss'
  goal: SchemeGoal
  topPick: boolean
  enName: string
  hiName: string
  enBenefit: string
  hiBenefit: string
  enWhyApplyFirst: string
  hiWhyApplyFirst: string
  enHighlights: string[]
  hiHighlights: string[]
  portalName: string
  source: string
  applyUrl: string
}

export const SCHEME_RECOMMENDATION_CATALOG: Record<RecommendedSchemePreview['id'], RecommendedSchemePreview> = {
  nmmss: {
    id: 'nmmss',
    goal: 'school',
    topPick: true,
    enName: 'National Means-cum-Merit Scholarship Scheme (NMMSS)',
    hiName: 'राष्ट्रीय साधन-सह-योग्यता छात्रवृत्ति योजना (NMMSS)',
    enBenefit: '₹12,000 per year (₹48,000 across Classes 9–12) via direct DBT',
    hiBenefit: 'कक्षा 9 से 12 तक ₹12,000 प्रति वर्ष (कुल ₹48,000) सीधे बैंक खाते में',
    enWhyApplyFirst:
      'Best scheme to apply to for school students: highest multi-year central grant (4 full years of support from Class 9 to 12) with direct DBT payout and zero application fee.',
    hiWhyApplyFirst:
      'स्कूली छात्रों के लिए सबसे मुख्य योजना: कक्षा 9 से 12 तक पूरे 4 साल प्रति वर्ष ₹12,000 की सीधी छात्रवृत्ति मिलती है।',
    enHighlights: ['Class 8 selection test', 'Parental income ≤ ₹3.5 Lakh', 'Govt / aided / local body school', 'Class 7 marks ≥ 55% (50% SC/ST)'],
    hiHighlights: ['कक्षा 8 चयन परीक्षा', 'अभिभावक आय ≤ ₹3.5 लाख', 'सरकारी / सहायता प्राप्त स्कूल', 'कक्षा 7 में ≥ 55% अंक (SC/ST 50%)'],
    portalName: 'National Scholarship Portal (NSP)',
    source: 'https://www.education.gov.in/nmms',
    applyUrl: 'https://scholarships.gov.in/',
  },
  csss: {
    id: 'csss',
    goal: 'college',
    topPick: true,
    enName: 'PM-USP Central Sector Scholarship (CSSS)',
    hiName: 'PM-USP केंद्रीय क्षेत्र छात्रवृत्ति योजना (CSSS)',
    enBenefit: 'Central merit scholarship for regular UG/PG college students via NSP',
    hiBenefit: 'नियमित कॉलेज (UG/PG) छात्रों के लिए NSP के माध्यम से केंद्रीय मेरिट छात्रवृत्ति',
    enWhyApplyFirst:
      'Most recommended scheme to apply to for college students: flagship Ministry of Education grant with direct annual DBT transfer — non-repayable scholarship (not an education loan).',
    hiWhyApplyFirst:
      'कॉलेज छात्रों के लिए सबसे पहले आवेदन करने योग्य योजना: शिक्षा मंत्रालय की सीधी वार्षिक छात्रवृत्ति जो लोन नहीं बल्कि अनुदान है।',
    enHighlights: ['Above 80th percentile in Class 12', 'Family income ≤ ₹4.5 Lakh', 'Regular degree course', 'No other scholarship / gap year'],
    hiHighlights: ['कक्षा 12 में 80वें पर्सेंटाइल से ऊपर', 'पारिवारिक आय ≤ ₹4.5 लाख', 'नियमित डिग्री कोर्स', 'कोई अन्य छात्रवृत्ति / अंतराल नहीं'],
    portalName: 'National Scholarship Portal (NSP)',
    source: 'https://scholarships.gov.in/',
    applyUrl: 'https://scholarships.gov.in/',
  },
  pmegp: {
    id: 'pmegp',
    goal: 'business',
    topPick: true,
    enName: 'PM Employment Generation Programme (PMEGP)',
    hiName: 'प्रधानमंत्री रोज़गार सृजन कार्यक्रम (PMEGP)',
    enBenefit: '15%–35% credit-linked government subsidy for new micro-enterprises',
    hiBenefit: 'नई सूक्ष्म इकाइयों (विनिर्माण / सेवा) के लिए 15%–35% सरकारी सब्सिडी',
    enWhyApplyFirst:
      'Most recommended scheme to apply to FIRST for new manufacturing or service founders: gives a non-repayable 15%–35% government subsidy on project cost (up to ₹50L manufacturing / ₹20L services) instead of full-interest debt.',
    hiWhyApplyFirst:
      'नया व्यवसाय शुरू करने वालों के लिए नंबर-1 योजना: इसमें केवल लोन नहीं बल्कि परियोजना लागत पर 15% से 35% तक सरकारी सब्सिडी मिलती है।',
    enHighlights: ['Age 18+ & new business unit', 'Manufacturing (≤ ₹50L) or Services (≤ ₹20L)', 'Class 8 pass for larger units', 'No prior govt subsidy on unit'],
    hiHighlights: ['उम्र 18+ और नई इकाई', 'विनिर्माण (≤ ₹50L) या सेवा (≤ ₹20L)', 'बड़ी इकाई हेतु कक्षा 8 पास', 'पहले सरकारी सब्सिडी न मिली हो'],
    portalName: 'KVIC PMEGP e-Portal',
    source: 'https://www.kviconline.gov.in/pmegpeportal/pmegphome/index.jsp',
    applyUrl: 'https://www.kviconline.gov.in/pmegpeportal/pmegphome/index.jsp',
  },
  mudra: {
    id: 'mudra',
    goal: 'business',
    topPick: false,
    enName: 'Pradhan Mantri MUDRA Yojana (Shishu · Kishore · Tarun · Tarun+)',
    hiName: 'प्रधानमंत्री मुद्रा योजना (शिशु · किशोर · तरुण · तरुण प्लस)',
    enBenefit: 'Collateral-free business credit up to ₹20 Lakh via JanSamarth / Banks',
    hiBenefit: 'बिना गारंटी ₹20 लाख तक का व्यावसायिक ऋण (जनसमर्थ / बैंक)',
    enWhyApplyFirst:
      'Best scheme to apply to if you run a trading business, an existing enterprise, or need fast collateral-free working capital up to ₹20 Lakh.',
    hiWhyApplyFirst:
      'व्यापार (Trading) या पहले से चल रहे व्यवसाय के लिए सबसे उपयुक्त योजना: बिना गारंटी ₹20 लाख तक का व्यावसायिक ऋण।',
    enHighlights: ['Covers Manufacturing, Services & Trading', 'New or existing business', 'Shishu ≤ ₹50K · Kishore ≤ ₹5L · Tarun ≤ ₹10L', 'Tarun Plus up to ₹20L'],
    hiHighlights: ['विनिर्माण, सेवा और व्यापार शामिल', 'नया या मौजूदा व्यवसाय', 'शिशु ≤ ₹50K · किशोर ≤ ₹5L · तरुण ≤ ₹10L', 'तरुण प्लस ₹20 लाख तक'],
    portalName: 'JanSamarth / Official MUDRA Portal',
    source: 'https://www.mudra.org.in/',
    applyUrl: 'https://www.jansamarth.in/home',
  },
}

export function getSuggestedSchemePreviewsForType(type: SelectableProfileType): RecommendedSchemePreview[] {
  if (type === 'school_student') return [SCHEME_RECOMMENDATION_CATALOG.nmmss]
  if (type === 'college_student') return [SCHEME_RECOMMENDATION_CATALOG.csss]
  if (type === 'entrepreneur') return [SCHEME_RECOMMENDATION_CATALOG.pmegp, SCHEME_RECOMMENDATION_CATALOG.mudra]
  return [
    SCHEME_RECOMMENDATION_CATALOG.pmegp,
    SCHEME_RECOMMENDATION_CATALOG.csss,
    SCHEME_RECOMMENDATION_CATALOG.nmmss,
    SCHEME_RECOMMENDATION_CATALOG.mudra,
  ]
}

export const PROFILE_TYPE_CARDS: {
  id: SelectableProfileType
  icon: typeof GraduationCap
  enTitle: string
  hiTitle: string
  enSub: string
  hiSub: string
  enSchemes: string
  hiSchemes: string
  questionCount: number
}[] = [
  {
    id: 'school_student',
    icon: BookOpen,
    enTitle: 'School Student',
    hiTitle: 'स्कूली छात्र (कक्षा 1–12)',
    enSub: 'Asks Class, school type, Class 7 marks & parental income.',
    hiSub: 'केवल कक्षा, स्कूल प्रकार, कक्षा 7 के अंक और पारिवारिक आय पूछेगा।',
    enSchemes: 'NMMSS School Scholarship',
    hiSchemes: 'NMMSS स्कूली छात्रवृत्ति',
    questionCount: 4,
  },
  {
    id: 'college_student',
    icon: GraduationCap,
    enTitle: 'College / University Student',
    hiTitle: 'कॉलेज / विश्वविद्यालय छात्र',
    enSub: 'Asks Class 12 percentile, regular degree, gap year & family income.',
    hiSub: 'केवल कक्षा 12 पर्सेंटाइल, नियमित डिग्री, अंतराल और आय पूछेगा।',
    enSchemes: 'PM-USP Central Sector Scholarship',
    hiSchemes: 'PM-USP केंद्रीय छात्रवृत्ति (CSSS)',
    questionCount: 5,
  },
  {
    id: 'entrepreneur',
    icon: BriefcaseBusiness,
    enTitle: 'Business / Entrepreneur',
    hiTitle: 'व्यवसायी / उद्यमी',
    enSub: 'Asks business stage, sector, project cost, loan & subsidy history.',
    hiSub: 'केवल व्यवसाय स्थिति, क्षेत्र, लागत, ऋण और सब्सिडी विवरण पूछेगा।',
    enSchemes: 'PMEGP Subsidy + PM MUDRA Loan',
    hiSchemes: 'PMEGP सब्सिडी + PM मुद्रा ऋण',
    questionCount: 6,
  },
  {
    id: 'all_rounder',
    icon: Layers,
    enTitle: 'Multi-Goal / Family',
    hiTitle: 'बहु-उद्देश्यीय / परिवार',
    enSub: 'Check multiple goals together for yourself or family members.',
    hiSub: 'परिवार या एक से अधिक लक्ष्यों की योजनाएँ एक साथ जाँचें।',
    enSchemes: 'All School, College & Business Schemes',
    hiSchemes: 'सभी स्कूल, कॉलेज और व्यवसाय योजनाएँ',
    questionCount: 15,
  },
]
