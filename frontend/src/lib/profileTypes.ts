import { BookOpen, BriefcaseBusiness, GraduationCap, Layers } from 'lucide-react'
import type { SchemeProfileType } from './schemeStore'

export type SelectableProfileType = Exclude<SchemeProfileType, 'unset'>

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
