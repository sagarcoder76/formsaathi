"""Stateless profile interview and explainable scheme screening."""
import os
from datetime import date
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field, StrictInt, StrictStr

router = APIRouter(prefix='/api/schemes', tags=['Scheme assistant'])


def text(en, hi):
    return {'en': en, 'hi': hi}


YES_NO = {'yes': text('Yes', 'हाँ'), 'no': text('No', 'नहीं')}
QUESTIONS = {}


def question(key, en, hi, options=None, low=0, high=100_000_000):
    QUESTIONS[key] = dict(id=key, prompt=text(en, hi), options=options, min=low, max=high)


question('goal', 'What would you like support with?', 'आप किस काम के लिए सहायता चाहते हैं?', {
    'business': text('Start or grow a business', 'व्यवसाय शुरू करें या बढ़ाएँ'),
    'college': text('Pay for college', 'कॉलेज की पढ़ाई का खर्च'),
    'school': text('Continue school education', 'स्कूल की पढ़ाई जारी रखें'),
})
question('age', 'How old are you?', 'आपकी उम्र कितनी है?', low=1, high=120)
question('stage', 'Is this a new or an existing business?', 'यह नया व्यवसाय है या पहले से चल रहा है?', {'new': text('New business', 'नया व्यवसाय'), 'existing': text('Existing business', 'मौजूदा व्यवसाय')})
question('sector', 'What kind of business is it?', 'आपका व्यवसाय किस प्रकार का है?', {'manufacturing': text('Manufacturing', 'विनिर्माण'), 'service': text('Services', 'सेवाएँ'), 'trade': text('Trading', 'व्यापार'), 'other': text('Other', 'अन्य')})
question('budget', 'What is the total project cost in rupees?', 'परियोजना की कुल लागत रुपये में कितनी है?', low=1)
question('loan', 'How much do you need to borrow in rupees?', 'आपको कितने रुपये का ऋण चाहिए?', low=1)
question('repaid', 'Have you successfully repaid a MUDRA Tarun loan?', 'क्या आपने मुद्रा तरुण ऋण सफलतापूर्वक चुका दिया है?', YES_NO)
question('eighth', 'Have you passed Class 8?', 'क्या आपने कक्षा 8 पास की है?', YES_NO)
question('subsidy', 'Has this unit already received a government subsidy?', 'क्या इस इकाई को पहले सरकारी सब्सिडी मिली है?', YES_NO)
question('income', 'What is your annual family income in rupees?', 'आपके परिवार की वार्षिक आय रुपये में कितनी है?')
question('percentile', 'Are you above the 80th percentile in your Class 12 board and stream?', 'क्या आप अपने कक्षा 12 बोर्ड और संकाय में 80वें पर्सेंटाइल से ऊपर हैं?', YES_NO)
question('regular', 'Are you pursuing a regular degree course (not diploma or distance learning)?', 'क्या आप नियमित डिग्री पाठ्यक्रम में हैं (डिप्लोमा या दूरस्थ शिक्षा नहीं)?', YES_NO)
question('gap', 'Did you take a gap after Class 12 before starting your degree?', 'क्या कक्षा 12 के बाद डिग्री शुरू करने से पहले आपने पढ़ाई में अंतराल लिया?', YES_NO)
question('aid', 'Are you receiving another scholarship or fee reimbursement?', 'क्या आपको कोई अन्य छात्रवृत्ति या शुल्क प्रतिपूर्ति मिल रही है?', YES_NO)
question('grade', 'Which class are you in now?', 'अभी आप किस कक्षा में हैं?', low=1, high=12)
question('school_type', 'Do you attend a government, government-aided or local body school (not a residential school covered by the exclusions)?', 'क्या आप सरकारी, सरकारी सहायता प्राप्त या स्थानीय निकाय के स्कूल में हैं (योजना से बाहर रखे गए आवासीय स्कूल में नहीं)?', YES_NO)
question('marks', 'Did you get at least 55% in Class 7 (50% for SC/ST)?', 'क्या कक्षा 7 में आपके कम से कम 55% अंक थे (SC/ST के लिए 50%)?', YES_NO)


def interview(a):
    if a.get('goal') == 'business':
        budget, loan = a.get('budget'), a.get('loan')
        path = ['goal', 'age', 'stage', 'sector', 'budget', 'loan']
        if a.get('sector') in ('manufacturing', 'service') and a.get('stage') == 'new':
            if isinstance(budget, int) and budget > (1_000_000 if a['sector'] == 'manufacturing' else 500_000):
                path.append('eighth')
            path.append('subsidy')
        # Tarun Plus history is only relevant above ₹10 lakh. Keep interviews at eight turns.
        if isinstance(loan, int) and 1_000_000 < loan <= 2_000_000:
            path = [k for k in path if k != 'subsidy'] + ['repaid'] if len(path) == 8 else path + ['repaid']
        return path
    if a.get('goal') == 'college':
        return ['goal', 'income', 'percentile', 'regular', 'gap', 'aid']
    if a.get('goal') == 'school':
        return ['goal', 'grade', 'income', 'school_type', 'marks']
    return ['goal']


UNKNOWN = 'unknown'


def rule(a, key, check, en, hi):
    value = a.get(key, UNKNOWN)
    return {'status': 'unknown' if value == UNKNOWN else 'pass' if check(value) else 'fail', 'criterion': text(en, hi)}


def is_value(value):
    return lambda actual: actual == value


def evaluate(a):
    results = []

    def add(id, name, source, en, hi, priority, checks, caveat):
        failed = sum(r['status'] == 'fail' for r in checks)
        unknown = sum(r['status'] == 'unknown' for r in checks)
        status = ('near_miss' if failed == 1 and not unknown else 'not_matched') if failed else 'needs_info' if unknown else 'match'
        results.append(dict(id=id, name=name, source=source, benefit=text(en, hi), priority=priority,
                            checks=checks, status=status, caveat=caveat))

    def r(key, check, en, hi):
        return rule(a, key, check, en, hi)

    if a['goal'] == 'business':
        sector = a.get('sector')
        adult = r('age', lambda n: n >= 18, 'Applicant is at least 18', 'आवेदक की उम्र कम से कम 18 वर्ष है')
        if sector in ('manufacturing', 'service', UNKNOWN) and a.get('stage') in ('new', UNKNOWN):
            cap = 5_000_000 if sector == 'manufacturing' else 2_000_000
            eighth_threshold = 1_000_000 if sector == 'manufacturing' else 500_000
            checks = [adult, r('stage', is_value('new'), 'New unit', 'नई इकाई'),
                      r('sector', lambda s: s in ('manufacturing', 'service'), 'Manufacturing or service activity in this screen', 'इस जाँच में विनिर्माण या सेवा गतिविधि'),
                      r('budget', lambda n: n <= cap, f'Project cost at most ₹{cap // 100000} lakh for this sector', f'इस क्षेत्र के लिए परियोजना लागत अधिकतम ₹{cap // 100000} लाख') if sector != UNKNOWN else
                      dict(status='unknown', criterion=text('Confirm the sector-specific project cost cap', 'क्षेत्र के अनुसार लागत सीमा की पुष्टि करें')),
                      r('subsidy', is_value('no'), 'Unit has not received a government subsidy', 'इकाई को पहले सरकारी सब्सिडी नहीं मिली है')]
            if isinstance(a.get('budget'), int) and a['budget'] > eighth_threshold:
                checks.append(r('eighth', is_value('yes'), 'Class 8 pass for this project size', 'इस परियोजना लागत पर कक्षा 8 पास आवश्यक है'))
            elif a.get('budget') == UNKNOWN:
                checks.append(dict(status='unknown', criterion=text('Confirm whether the Class 8 requirement applies', 'कक्षा 8 की शर्त लागू है या नहीं, इसकी पुष्टि करें')))
            add('pmegp', 'PM Employment Generation Programme (PMEGP)', 'https://www.kviconline.gov.in/pmegpeportal/pmegphome/index.jsp',
                'Credit-linked subsidy for new micro-enterprises', 'नई सूक्ष्म इकाइयों के लिए ऋण से जुड़ी सब्सिडी', 100, checks,
                text('This screens the first-loan route only. Confirm the activity, capital expenditure, family restrictions, contribution, bank appraisal and current intake with KVIC.', 'यह केवल प्रथम ऋण की जाँच है। गतिविधि, पूंजीगत व्यय, पारिवारिक शर्तें, अपना अंशदान, बैंक मूल्यांकन और वर्तमान आवेदन स्थिति KVIC से जाँचें।'))
        loan = a.get('loan')
        tier = ''
        if isinstance(loan, int):
            tier = ' — ' + ('Shishu' if loan <= 50_000 else 'Kishore' if loan <= 500_000 else 'Tarun' if loan <= 1_000_000 else 'Tarun Plus') if loan <= 2_000_000 else ''
        checks = [adult, r('sector', lambda s: s in ('manufacturing', 'service', 'trade'), 'Business sector covered by this screen', 'व्यवसाय क्षेत्र इस जाँच में शामिल है'),
                  r('loan', lambda n: n <= 2_000_000, 'Requested borrowing is at most ₹20 lakh', 'माँगा गया ऋण अधिकतम ₹20 लाख है')]
        if isinstance(loan, int) and 1_000_000 < loan <= 2_000_000:
            checks.append(r('repaid', is_value('yes'), 'Tarun Plus requires successful repayment of a previous Tarun loan', 'तरुण प्लस के लिए पिछला तरुण ऋण सफलतापूर्वक चुकाना जरूरी है'))
        add('mudra', 'Pradhan Mantri MUDRA Yojana' + tier, 'https://www.mudra.org.in/', 'Collateral-free business credit (not a grant)', 'बिना संपार्श्विक का व्यावसायिक ऋण (अनुदान नहीं)', 80, checks,
            text('Confirm lender-specific eligibility, activity coverage (including allied agriculture), credit appraisal and required documents.', 'ऋणदाता की पात्रता, गतिविधि कवरेज (कृषि से जुड़ी गतिविधियों सहित), ऋण मूल्यांकन और दस्तावेज़ जाँचें।'))
    if a['goal'] == 'college':
        add('csss', 'PM-USP Central Sector Scholarship (CSSS)', 'https://scholarships.gov.in/', 'Scholarship for eligible regular college students', 'पात्र नियमित कॉलेज छात्रों के लिए छात्रवृत्ति', 100,
            [r('income', lambda n: n <= 450_000, 'Annual family income at most ₹4.5 lakh', 'वार्षिक पारिवारिक आय अधिकतम ₹4.5 लाख'),
             r('percentile', is_value('yes'), 'Above the 80th board-and-stream percentile in Class 12', 'कक्षा 12 में बोर्ड और संकाय के 80वें पर्सेंटाइल से ऊपर'),
             r('regular', is_value('yes'), 'Regular degree, not a diploma or distance course', 'नियमित डिग्री, डिप्लोमा या दूरस्थ पाठ्यक्रम नहीं'),
             r('gap', is_value('no'), 'No gap after Class 12', 'कक्षा 12 के बाद पढ़ाई में अंतराल नहीं'),
             r('aid', is_value('no'), 'No other scholarship or fee reimbursement', 'अन्य छात्रवृत्ति या शुल्क प्रतिपूर्ति नहीं')],
            text('Fresh application screen only. Check institution recognition, merit slots and current deadlines on NSP.', 'केवल नए आवेदन की जाँच। संस्था की मान्यता, मेरिट सीट और वर्तमान अंतिम तिथि NSP पर देखें।'))
    if a['goal'] == 'school':
        add('nmmss', 'National Means-cum-Merit Scholarship Scheme', 'https://www.education.gov.in/nmms', '₹12,000 per year for selected students from Class 9', 'कक्षा 9 से चयनित छात्रों को ₹12,000 प्रति वर्ष', 100,
            [r('grade', is_value(8), 'In Class 8 for the selection test', 'चयन परीक्षा के लिए कक्षा 8 में'),
             r('income', lambda n: n <= 350_000, 'Annual parental income at most ₹3.5 lakh', 'वार्षिक अभिभावक आय अधिकतम ₹3.5 लाख'),
             r('school_type', is_value('yes'), 'Eligible government, aided or local body school', 'पात्र सरकारी, सहायता प्राप्त या स्थानीय निकाय स्कूल'),
             r('marks', is_value('yes'), 'Class 7 marks at least 55% (50% for SC/ST)', 'कक्षा 7 में कम से कम 55% अंक (SC/ST के लिए 50%)')],
            text('Screen for the state selection test only. Verify exclusions, passing marks, state quota and current application dates.', 'केवल राज्य चयन परीक्षा की जाँच। अपवर्जन, उत्तीर्ण अंक, राज्य कोटा और वर्तमान आवेदन तिथियाँ देखें।'))
    order = {'match': 0, 'near_miss': 1, 'needs_info': 2, 'not_matched': 3}
    return sorted(results, key=lambda s: (order[s['status']], -s['priority'], s['id']))


class Intake(BaseModel):
    model_config = ConfigDict(extra='forbid')
    language: Literal['en', 'hi'] = 'en'
    answers: dict[str, StrictStr | StrictInt] = Field(default_factory=dict, max_length=8)
    explain: bool = False


def localize(obj, lang):
    if isinstance(obj, dict):
        return obj[lang] if set(obj) == {'en', 'hi'} else {k: localize(v, lang) for k, v in obj.items()}
    if isinstance(obj, list):
        return [localize(v, lang) for v in obj]
    return obj


def explain_report(results, language):
    key = os.getenv('SCHEME_OPENAI_API_KEY')
    if not key:
        return None
    # Send only public scheme titles/benefits, not answers or their pass/fail outcomes.
    facts = [{'scheme': s['name'], 'benefit': s['benefit']} for s in results]
    try:
        response = httpx.post('https://api.openai.com/v1/chat/completions', headers={'Authorization': f'Bearer {key}'},
                              json={'model': os.getenv('SCHEME_OPENAI_MODEL', 'gpt-4o-mini'), 'max_tokens': 160,
                                    'messages': [{'role': 'system', 'content': 'Summarize these public benefit descriptions in two plain sentences. Do not infer eligibility, give amounts not in the input, or add rules. Respond in ' + ('Hindi' if language == 'hi' else 'English')},
                                                 {'role': 'user', 'content': str(facts)}]}, timeout=5)
        response.raise_for_status()
        return response.json()['choices'][0]['message']['content'].strip()[:800] or None
    except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError, AttributeError):
        return None


DISCLAIMER = text(
    'This is a preliminary check of a curated catalogue, not an exhaustive search or an official eligibility decision. Confirm current rules and applications with the issuing authority.',
    'यह चुनिंदा योजनाओं की प्रारंभिक जाँच है, पूरी सूची या आधिकारिक पात्रता निर्णय नहीं। वर्तमान नियम और आवेदन की स्थिति संबंधित विभाग से जाँचें।',
)
REPORT_LABELS = {
    'match': text('Profile match', 'प्रोफ़ाइल से मेल'),
    'near_miss': text('One requirement away', 'एक शर्त बाकी'),
    'needs_info': text('More information needed', 'अधिक जानकारी चाहिए'),
    'not_matched': text('Does not match', 'मेल नहीं है'),
}
CHECK_LABELS = {
    'pass': text('Meets', 'पूरी'), 'fail': text('Required', 'ज़रूरी'), 'unknown': text('Confirm', 'जाँचें'),
}


def build_report(results, language, generated):
    lines = [text('FormSaathi · Scheme report', 'FormSaathi · योजना रिपोर्ट')[language], generated, DISCLAIMER[language]]
    for n, scheme in enumerate(results, 1):
        lines.extend(['', f"{n}. {scheme['name']} — {REPORT_LABELS[scheme['status']][language]}", scheme['benefit']])
        lines.extend(f"- {CHECK_LABELS[c['status']][language]}: {c['criterion']}" for c in scheme['checks'])
        lines.extend([scheme['caveat'], scheme['source']])
    return '\n'.join(lines) + '\n'


@router.post('/intake')
def intake(req: Intake, response: Response):
    response.headers['Cache-Control'] = 'no-store'
    a = req.answers
    for k, v in a.items():
        q = QUESTIONS.get(k)
        if q is None or (v != UNKNOWN and (v not in q['options'] if q['options'] else not isinstance(v, int) or not q['min'] <= v <= q['max'])) or (k == 'goal' and v == UNKNOWN):
            raise HTTPException(422, 'Invalid interview answer')
    path = interview(a)
    answered = [k for k in path if k in a]
    if set(a) != set(answered) or answered != path[:len(answered)]:
        raise HTTPException(422, 'Answers must follow the interview order')
    lang = req.language
    prompts = []
    for k in answered:
        q = QUESTIONS[k]
        val = a[k]
        label = text('Not sure', 'पता नहीं') if val == UNKNOWN else q['options'][val] if q['options'] else str(val)
        prompts.append(dict(prompt=localize(q['prompt'], lang), answer=localize(label, lang)))
    if len(answered) < len(path):
        question = localize(QUESTIONS[path[len(answered)]], lang)
        return dict(question=question, transcript=prompts, step=len(answered)+1)
    results = localize(evaluate(a), lang)
    generated = date.today().isoformat()
    ai_available = bool(os.getenv('SCHEME_OPENAI_API_KEY'))
    overview = explain_report(results, lang) if req.explain and ai_available else None
    return dict(question=None, transcript=prompts, results=results, date=generated,
                disclaimer=DISCLAIMER[lang], report=build_report(results, lang, generated),
                labels=localize(REPORT_LABELS, lang), ai_available=ai_available,
                overview=overview, ai_failed=bool(req.explain and not overview))


GoalKey = Literal['business', 'college', 'school']
YesNoUnknown = Literal['yes', 'no', 'unknown']
CategoryKey = Literal['general', 'obc', 'sc', 'st', 'ews', 'unknown']
DocKey = Literal[
    'identity_address',
    'bank_passbook',
    'income_certificate',
    'marksheets',
    'bonafide_admission',
    'business_plan',
    'category_certificate',
]

DOC_LABELS: dict[str, dict[str, str]] = {
    'identity_address': text('Government ID & address proof', 'सरकारी पहचान और पता प्रमाण'),
    'bank_passbook': text('Active bank account (DBT / Aadhaar-seeded)', 'सक्रिय बैंक खाता (DBT / आधार से जुड़ा)'),
    'income_certificate': text('Valid annual family income certificate', 'वैध वार्षिक पारिवारिक आय प्रमाणपत्र'),
    'marksheets': text(' qualifying exam / previous class marksheet', 'पिछली कक्षा / बोर्ड परीक्षा अंकतालिका'),
    'bonafide_admission': text('School / college enrollment or bonafide proof', 'स्कूल / कॉलेज नामांकन या बोनाफाइड प्रमाण'),
    'business_plan': text('Project report / activity & cost breakup', 'परियोजना रिपोर्ट / व्यवसाय और लागत विवरण'),
    'category_certificate': text('Social category certificate (SC/ST/OBC/EWS)', 'श्रेणी प्रमाणपत्र (SC/ST/OBC/EWS)'),
}
DOC_LABELS['marksheets'] = text('Qualifying exam / previous class marksheet', 'पिछली कक्षा / बोर्ड परीक्षा अंकतालिका')

CATEGORY_LABELS: dict[str, dict[str, str]] = {
    'general': text('General', 'सामान्य'),
    'obc': text('OBC', 'अन्य पिछड़ा वर्ग (OBC)'),
    'sc': text('SC', 'अनुसूचित जाति (SC)'),
    'st': text('ST', 'अनुसूचित जनजाति (ST)'),
    'ews': text('EWS', 'आर्थिक रूप से कमज़ोर वर्ग (EWS)'),
}

FIELD_LABELS: dict[str, dict[str, str]] = {
    'full_name': text('Full name', 'पूरा नाम'),
    'state': text('State / UT', 'राज्य / केंद्र शासित प्रदेश'),
    'category': text('Social category', 'सामाजिक श्रेणी'),
    'age': text('Applicant age', 'आवेदक की उम्र'),
    'income': text('Annual family income', 'वार्षिक पारिवारिक आय'),
    'stage': text('Business stage (new / existing)', 'व्यवसाय की स्थिति (नया / मौजूदा)'),
    'sector': text('Business sector', 'व्यवसाय का क्षेत्र'),
    'budget': text('Total project cost', 'परियोजना की कुल लागत'),
    'loan': text('Loan amount needed', 'आवश्यक ऋण राशि'),
    'eighth': text('Class 8 pass status', 'कक्षा 8 उत्तीर्ण स्थिति'),
    'subsidy': text('Previous government subsidy status', 'पूर्व सरकारी सब्सिडी स्थिति'),
    'repaid': text('Previous MUDRA Tarun repayment', 'पूर्व मुद्रा तरुण ऋण भुगतान'),
    'percentile': text('Class 12 80th percentile status', 'कक्षा 12 में 80वें पर्सेंटाइल की स्थिति'),
    'regular': text('Regular degree course status', 'नियमित डिग्री पाठ्यक्रम स्थिति'),
    'gap': text('Gap year after Class 12', 'कक्षा 12 के बाद अंतराल'),
    'aid': text('Other scholarship / fee reimbursement', 'अन्य छात्रवृत्ति / शुल्क प्रतिपूर्ति'),
    'grade': text('Current school class', 'वर्तमान कक्षा'),
    'school_type': text('Government / aided school status', 'सरकारी / सहायता प्राप्त स्कूल स्थिति'),
    'marks': text('Class 7 qualifying marks', 'कक्षा 7 के अर्हक अंक'),
}


def format_inr(amount: int) -> str:
    s = str(abs(amount))
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        groups = []
        while len(head) > 2:
            groups.insert(0, head[-2:])
            head = head[:-2]
        if head:
            groups.insert(0, head)
        s = ','.join(groups) + ',' + tail
    return ('-₹' if amount < 0 else '₹') + s


class SchemeProfileData(BaseModel):
    model_config = ConfigDict(extra='forbid')
    full_name: StrictStr = Field(default='', max_length=120)
    state: StrictStr = Field(default='', max_length=80)
    category: CategoryKey = UNKNOWN
    goals: list[GoalKey] = Field(default_factory=list, max_length=3)
    age: StrictInt | Literal['unknown'] = UNKNOWN
    income: StrictInt | Literal['unknown'] = UNKNOWN
    stage: Literal['new', 'existing', 'unknown'] = UNKNOWN
    sector: Literal['manufacturing', 'service', 'trade', 'other', 'unknown'] = UNKNOWN
    budget: StrictInt | Literal['unknown'] = UNKNOWN
    loan: StrictInt | Literal['unknown'] = UNKNOWN
    repaid: YesNoUnknown = UNKNOWN
    eighth: YesNoUnknown = UNKNOWN
    subsidy: YesNoUnknown = UNKNOWN
    percentile: YesNoUnknown = UNKNOWN
    regular: YesNoUnknown = UNKNOWN
    gap: YesNoUnknown = UNKNOWN
    aid: YesNoUnknown = UNKNOWN
    grade: StrictInt | Literal['unknown'] = UNKNOWN
    school_type: YesNoUnknown = UNKNOWN
    marks: YesNoUnknown = UNKNOWN
    documents: list[DocKey] = Field(default_factory=list, max_length=10)


class ProfileMatchRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    language: Literal['en', 'hi'] = 'en'
    profile: SchemeProfileData = Field(default_factory=SchemeProfileData)


def _validate_numeric_bounds(p: SchemeProfileData) -> None:
    bounds = {
        'age': (p.age, 1, 120),
        'income': (p.income, 0, 100_000_000),
        'budget': (p.budget, 1, 100_000_000),
        'loan': (p.loan, 1, 100_000_000),
        'grade': (p.grade, 1, 12),
    }
    for key, (val, low, high) in bounds.items():
        if val != UNKNOWN and (not isinstance(val, int) or isinstance(val, bool) or not low <= val <= high):
            raise HTTPException(422, f'Invalid profile value for {key}')


def _prefill_entry(key: str, raw_val, formatted):
    missing = raw_val in (UNKNOWN, '', None)
    return {
        'key': key,
        'label': FIELD_LABELS[key],
        'value': text('Not filled in profile yet', 'प्रोफ़ाइल में अभी भरा नहीं गया') if missing else formatted,
        'ready': not missing,
    }


def _yes_no_label(val: str):
    return YES_NO.get(val, text('Not filled in profile yet', 'प्रोफ़ाइल में अभी भरा नहीं गया'))


def _evaluate_profile_schemes(p: SchemeProfileData):
    active_goals: list[GoalKey] = list(dict.fromkeys(p.goals)) or ['business', 'college', 'school']
    a = p.model_dump()
    docs_set = set(p.documents)
    has_reserved_cat = p.category in ('sc', 'st', 'obc', 'ews')
    results = []

    def doc_items(doc_keys: list[str]):
        return [{'id': dk, 'label': DOC_LABELS[dk], 'ready': dk in docs_set} for dk in doc_keys]

    def applicant_fields():
        return [
            _prefill_entry('full_name', p.full_name.strip(), text(p.full_name.strip(), p.full_name.strip())),
            _prefill_entry('state', p.state.strip(), text(p.state.strip(), p.state.strip())),
            _prefill_entry('category', p.category, CATEGORY_LABELS.get(p.category, text('', ''))),
        ]

    if 'business' in active_goals:
        # 1. PMEGP (evaluated for all business profiles so disqualifiers are transparent)
        sector = p.sector
        adult = rule(a, 'age', lambda n: n >= 18, 'Applicant is at least 18', 'आवेदक की उम्र कम से कम 18 वर्ष है')
        cap = 5_000_000 if sector == 'manufacturing' else 2_000_000
        eighth_threshold = 1_000_000 if sector == 'manufacturing' else 500_000
        pmegp_checks = [
            adult,
            rule(a, 'stage', is_value('new'), 'New unit', 'नई इकाई'),
            rule(a, 'sector', lambda s: s in ('manufacturing', 'service'),
                 'Manufacturing or service activity in this screen', 'इस जाँच में विनिर्माण या सेवा गतिविधि'),
            rule(a, 'budget', lambda n: n <= cap,
                 f'Project cost at most ₹{cap // 100000} lakh for this sector',
                 f'इस क्षेत्र के लिए परियोजना लागत अधिकतम ₹{cap // 100000} लाख')
            if sector in ('manufacturing', 'service')
            else (dict(status='fail', criterion=text('Eligible manufacturing or service sector required for project cap', 'परियोजना सीमा के लिए पात्र विनिर्माण या सेवा क्षेत्र आवश्यक'))
                  if sector in ('trade', 'other')
                  else dict(status='unknown', criterion=text('Confirm the sector-specific project cost cap', 'क्षेत्र के अनुसार लागत सीमा की पुष्टि करें'))),
            rule(a, 'subsidy', is_value('no'), 'Unit has not received a government subsidy', 'इकाई को पहले सरकारी सब्सिडी नहीं मिली है'),
        ]
        need_eighth_doc = False
        if isinstance(p.budget, int) and p.budget > eighth_threshold and sector in ('manufacturing', 'service', UNKNOWN):
            pmegp_checks.append(rule(a, 'eighth', is_value('yes'), 'Class 8 pass for this project size', 'इस परियोजना लागत पर कक्षा 8 पास आवश्यक है'))
            need_eighth_doc = True
        elif p.budget == UNKNOWN:
            pmegp_checks.append(dict(status='unknown', criterion=text('Confirm whether the Class 8 requirement applies', 'कक्षा 8 की शर्त लागू है या नहीं, इसकी पुष्टि करें')))

        pmegp_docs = ['identity_address', 'bank_passbook', 'business_plan']
        if need_eighth_doc:
            pmegp_docs.append('marksheets')
        if has_reserved_cat:
            pmegp_docs.append('category_certificate')

        sector_text = QUESTIONS['sector']['options'].get(p.sector, text('', ''))
        stage_text = QUESTIONS['stage']['options'].get(p.stage, text('', ''))
        pmegp_prefill = applicant_fields() + [
            _prefill_entry('age', p.age, text(f'{p.age} years', f'{p.age} वर्ष') if isinstance(p.age, int) else text('', '')),
            _prefill_entry('stage', p.stage, stage_text),
            _prefill_entry('sector', p.sector, sector_text),
            _prefill_entry('budget', p.budget, text(format_inr(p.budget), format_inr(p.budget)) if isinstance(p.budget, int) else text('', '')),
            _prefill_entry('eighth', p.eighth, _yes_no_label(p.eighth)),
            _prefill_entry('subsidy', p.subsidy, _yes_no_label(p.subsidy)),
        ]
        results.append(dict(
            id='pmegp',
            goal='business',
            name='PM Employment Generation Programme (PMEGP)',
            portal_name=text('KVIC PMEGP e-Portal', 'KVIC PMEGP ई-पोर्टल'),
            source='https://www.kviconline.gov.in/pmegpeportal/pmegphome/index.jsp',
            apply_url='https://www.kviconline.gov.in/pmegpeportal/pmegphome/index.jsp',
            benefit=text('Credit-linked subsidy for new micro-enterprises', 'नई सूक्ष्म इकाइयों के लिए ऋण से जुड़ी सब्सिडी'),
            priority=100,
            checks=pmegp_checks,
            caveat=text('This screens the first-loan route only. Confirm the activity, capital expenditure, family restrictions, contribution, bank appraisal and current intake with KVIC.',
                        'यह केवल प्रथम ऋण की जाँच है। गतिविधि, पूंजीगत व्यय, पारिवारिक शर्तें, अपना अंशदान, बैंक मूल्यांकन और वर्तमान आवेदन स्थिति KVIC से जाँचें।'),
            required_documents=doc_items(pmegp_docs),
            prefill_fields=pmegp_prefill,
            apply_steps=[
                text('Open the official KVIC PMEGP e-Portal ("Application for New Unit") and complete Aadhaar / mobile OTP verification.',
                     'आधिकारिक KVIC PMEGP ई-पोर्टल ("Application for New Unit") खोलें और आधार / मोबाइल OTP सत्यापन पूरा करें।'),
                text('Copy your pre-filled applicant, sector and project cost details from the sheet above into the online form.',
                     'ऊपर दी गई प्री-फ़िल्ड शीट से अपने आवेदक, क्षेत्र और परियोजना लागत के विवरण ऑनलाइन फ़ॉर्म में कॉपी करें।'),
                text('Upload your project report, identity proof and qualifying certificates on the KVIC portal.',
                     'KVIC पोर्टल पर अपनी परियोजना रिपोर्ट, पहचान प्रमाण और आवश्यक प्रमाणपत्र अपलोड करें।'),
                text('Submit on the official portal and save your PMEGP Application ID below to track status.',
                     'आधिकारिक पोर्टल पर सबमिट करें और स्थिति ट्रैक करने के लिए अपना PMEGP आवेदन आईडी नीचे सहेजें।'),
            ],
        ))

        # 2. MUDRA
        loan = p.loan
        tier = ''
        tier_label = text('Select loan amount to determine Shishu / Kishore / Tarun tier', 'शिशु / किशोर / तरुण श्रेणी जानने के लिए ऋण राशि भरें')
        if isinstance(loan, int) and loan <= 2_000_000:
            t_name = 'Shishu' if loan <= 50_000 else 'Kishore' if loan <= 500_000 else 'Tarun' if loan <= 1_000_000 else 'Tarun Plus'
            tier = ' — ' + t_name
            tier_label = text(f'{t_name} ({format_inr(loan)})', f'{t_name} ({format_inr(loan)})')
        elif isinstance(loan, int):
            tier_label = text(f'{format_inr(loan)} (above ₹20 lakh MUDRA cap)', f'{format_inr(loan)} (₹20 लाख मुद्रा सीमा से अधिक)')
        mudra_checks = [
            adult,
            rule(a, 'sector', lambda s: s in ('manufacturing', 'service', 'trade'),
                 'Business sector covered by this screen', 'व्यवसाय क्षेत्र इस जाँच में शामिल है'),
            rule(a, 'loan', lambda n: n <= 2_000_000, 'Requested borrowing is at most ₹20 lakh', 'माँगा गया ऋण अधिकतम ₹20 लाख है'),
        ]
        if isinstance(loan, int) and 1_000_000 < loan <= 2_000_000:
            mudra_checks.append(rule(a, 'repaid', is_value('yes'),
                                     'Tarun Plus requires successful repayment of a previous Tarun loan',
                                     'तरुण प्लस के लिए पिछला तरुण ऋण सफलतापूर्वक चुकाना जरूरी है'))
        mudra_prefill = applicant_fields() + [
            _prefill_entry('age', p.age, text(f'{p.age} years', f'{p.age} वर्ष') if isinstance(p.age, int) else text('', '')),
            _prefill_entry('sector', p.sector, sector_text),
            _prefill_entry('loan', p.loan, tier_label),
        ]
        if isinstance(loan, int) and 1_000_000 < loan <= 2_000_000:
            mudra_prefill.append(_prefill_entry('repaid', p.repaid, _yes_no_label(p.repaid)))
        results.append(dict(
            id='mudra',
            goal='business',
            name='Pradhan Mantri MUDRA Yojana' + tier,
            portal_name=text('JanSamarth / Official MUDRA Portal', 'जनसमर्थ / आधिकारिक मुद्रा पोर्टल'),
            source='https://www.mudra.org.in/',
            apply_url='https://www.jansamarth.in/home',
            benefit=text('Collateral-free business credit (not a grant)', 'बिना संपार्श्विक का व्यावसायिक ऋण (अनुदान नहीं)'),
            priority=80,
            checks=mudra_checks,
            caveat=text('Confirm lender-specific eligibility, activity coverage (including allied agriculture), credit appraisal and required documents.',
                        'ऋणदाता की पात्रता, गतिविधि कवरेज (कृषि से जुड़ी गतिविधियों सहित), ऋण मूल्यांकन और दस्तावेज़ जाँचें।'),
            required_documents=doc_items(['identity_address', 'bank_passbook', 'business_plan']),
            prefill_fields=mudra_prefill,
            apply_steps=[
                text('Open JanSamarth (national credit portal) or your preferred participating bank / NBFC portal and sign in via mobile OTP.',
                     'जनसमर्थ पोर्टल या संबंधित बैंक / NBFC पोर्टल खोलें और मोबाइल OTP से लॉगिन करें।'),
                text('Choose Business Activity Loan (PMMY / MUDRA) and enter the pre-filled borrowing and business details above.',
                     'व्यावसायिक ऋण (PMMY / MUDRA) चुनें और ऊपर दिए गए ऋण व व्यवसाय विवरण दर्ज करें।'),
                text('Upload identity, bank statement and business quotation/project details requested by the lender.',
                     'ऋणदाता द्वारा माँगे गए पहचान पत्र, बैंक विवरण और व्यवसाय कोटेशन अपलोड करें।'),
                text('Record your JanSamarth / bank reference number below to track approval.',
                     'स्वीकृति ट्रैक करने के लिए अपना जनसमर्थ / बैंक संदर्भ नंबर नीचे सहेजें।'),
            ],
        ))

    if 'college' in active_goals:
        csss_docs = ['identity_address', 'bank_passbook', 'income_certificate', 'marksheets', 'bonafide_admission']
        if has_reserved_cat:
            csss_docs.append('category_certificate')
        csss_prefill = applicant_fields() + [
            _prefill_entry('income', p.income, text(format_inr(p.income), format_inr(p.income)) if isinstance(p.income, int) else text('', '')),
            _prefill_entry('percentile', p.percentile, _yes_no_label(p.percentile)),
            _prefill_entry('regular', p.regular, _yes_no_label(p.regular)),
            _prefill_entry('gap', p.gap, _yes_no_label(p.gap)),
            _prefill_entry('aid', p.aid, _yes_no_label(p.aid)),
        ]
        results.append(dict(
            id='csss',
            goal='college',
            name='PM-USP Central Sector Scholarship (CSSS)',
            portal_name=text('National Scholarship Portal (NSP)', 'नेशनल स्कॉलरशिप पोर्टल (NSP)'),
            source='https://scholarships.gov.in/',
            apply_url='https://scholarships.gov.in/',
            benefit=text('Scholarship for eligible regular college students', 'पात्र नियमित कॉलेज छात्रों के लिए छात्रवृत्ति'),
            priority=100,
            checks=[
                rule(a, 'income', lambda n: n <= 450_000, 'Annual family income at most ₹4.5 lakh', 'वार्षिक पारिवारिक आय अधिकतम ₹4.5 लाख'),
                rule(a, 'percentile', is_value('yes'), 'Above the 80th board-and-stream percentile in Class 12', 'कक्षा 12 में बोर्ड और संकाय के 80वें पर्सेंटाइल से ऊपर'),
                rule(a, 'regular', is_value('yes'), 'Regular degree, not a diploma or distance course', 'नियमित डिग्री, डिप्लोमा या दूरस्थ पाठ्यक्रम नहीं'),
                rule(a, 'gap', is_value('no'), 'No gap after Class 12', 'कक्षा 12 के बाद पढ़ाई में अंतराल नहीं'),
                rule(a, 'aid', is_value('no'), 'No other scholarship or fee reimbursement', 'अन्य छात्रवृत्ति या शुल्क प्रतिपूर्ति नहीं'),
            ],
            caveat=text('Fresh application screen only. Check institution recognition, merit slots and current deadlines on NSP.',
                        'केवल नए आवेदन की जाँच। संस्था की मान्यता, मेरिट सीट और वर्तमान अंतिम तिथि NSP पर देखें।'),
            required_documents=doc_items(csss_docs),
            prefill_fields=csss_prefill,
            apply_steps=[
                text('Complete One-Time Registration (OTR) and e-KYC on scholarships.gov.in.',
                     'scholarships.gov.in पर वन-टाइम रजिस्ट्रेशन (OTR) और e-KYC पूरा करें।'),
                text('Select Department of Higher Education → PM-USP CSSS (Fresh) and paste your pre-filled academic & income details.',
                     'उच्च शिक्षा विभाग → PM-USP CSSS (Fresh) चुनें और ऊपर दिए गए शैक्षणिक व आय विवरण भरें।'),
                text('Upload your income certificate, Class 12 marksheet and college bonafide details for institute verification.',
                     'संस्थान सत्यापन के लिए आय प्रमाणपत्र, कक्षा 12 की अंकतालिका और कॉलेज बोनाफाइड विवरण अपलोड करें।'),
                text('Save your NSP Application ID below to track institute and state nodal verification.',
                     'संस्थान और नोडल सत्यापन ट्रैक करने के लिए अपना NSP आवेदन आईडी नीचे सहेजें।'),
            ],
        ))

    if 'school' in active_goals:
        nmmss_docs = ['identity_address', 'bank_passbook', 'income_certificate', 'marksheets', 'bonafide_admission']
        if p.category in ('sc', 'st'):
            nmmss_docs.append('category_certificate')
        nmmss_prefill = applicant_fields() + [
            _prefill_entry('grade', p.grade, text(f'Class {p.grade}', f'कक्षा {p.grade}') if isinstance(p.grade, int) else text('', '')),
            _prefill_entry('income', p.income, text(format_inr(p.income), format_inr(p.income)) if isinstance(p.income, int) else text('', '')),
            _prefill_entry('school_type', p.school_type, _yes_no_label(p.school_type)),
            _prefill_entry('marks', p.marks, _yes_no_label(p.marks)),
        ]
        results.append(dict(
            id='nmmss',
            goal='school',
            name='National Means-cum-Merit Scholarship Scheme',
            portal_name=text('NSP / State SCERT NMMSS Portal', 'NSP / राज्य SCERT NMMSS पोर्टल'),
            source='https://www.education.gov.in/nmms',
            apply_url='https://scholarships.gov.in/',
            benefit=text('₹12,000 per year for selected students from Class 9', 'कक्षा 9 से चयनित छात्रों को ₹12,000 प्रति वर्ष'),
            priority=100,
            checks=[
                rule(a, 'grade', is_value(8), 'In Class 8 for the selection test', 'चयन परीक्षा के लिए कक्षा 8 में'),
                rule(a, 'income', lambda n: n <= 350_000, 'Annual parental income at most ₹3.5 lakh', 'वार्षिक अभिभावक आय अधिकतम ₹3.5 लाख'),
                rule(a, 'school_type', is_value('yes'), 'Eligible government, aided or local body school', 'पात्र सरकारी, सहायता प्राप्त या स्थानीय निकाय स्कूल'),
                rule(a, 'marks', is_value('yes'), 'Class 7 marks at least 55% (50% for SC/ST)', 'कक्षा 7 में कम से कम 55% अंक (SC/ST के लिए 50%)'),
            ],
            caveat=text('Screen for the state selection test only. Verify exclusions, passing marks, state quota and current application dates.',
                        'केवल राज्य चयन परीक्षा की जाँच। अपवर्जन, उत्तीर्ण अंक, राज्य कोटा और वर्तमान आवेदन तिथियाँ देखें।'),
            required_documents=doc_items(nmmss_docs),
            prefill_fields=nmmss_prefill,
            apply_steps=[
                text('Register for your state SCERT Class 8 NMMSS selection test and complete OTR on scholarships.gov.in.',
                     'अपने राज्य SCERT की कक्षा 8 NMMSS चयन परीक्षा के लिए पंजीकरण करें और scholarships.gov.in पर OTR पूरा करें।'),
                text('Fill in Class 7 marks, school type and parental income from your pre-filled sheet above.',
                     'ऊपर दी गई प्री-फ़िल्ड शीट से कक्षा 7 के अंक, स्कूल का प्रकार और अभिभावक आय भरें।'),
                text('Get your school headmaster / principal verification completed with your income and Class 7 certificates.',
                     'आय और कक्षा 7 प्रमाणपत्रों के साथ अपने स्कूल प्रधानाचार्य से सत्यापन पूरा कराएँ।'),
                text('Save your NMMSS / NSP Application ID below to follow exam & disbursement status.',
                     'परीक्षा और छात्रवृत्ति स्थिति ट्रैक करने के लिए अपना NMMSS / NSP आवेदन आईडी नीचे सहेजें।'),
            ],
        ))

    for item in results:
        checks = item['checks']
        failed = sum(c['status'] == 'fail' for c in checks)
        unknown = sum(c['status'] == 'unknown' for c in checks)
        item['status'] = ('near_miss' if failed == 1 and not unknown else 'not_matched') if failed else 'needs_info' if unknown else 'match'

    order = {'match': 0, 'near_miss': 1, 'needs_info': 2, 'not_matched': 3}
    sorted_results = sorted(results, key=lambda s: (order[s['status']], -s['priority'], s['id']))

    # Compute profile completion & missing fields across active goals
    required_keys: list[str] = ['full_name', 'state', 'category']
    if 'business' in active_goals:
        for k in ('age', 'stage', 'sector', 'budget', 'loan', 'subsidy'):
            if k not in required_keys:
                required_keys.append(k)
        eighth_cap = 1_000_000 if p.sector == 'manufacturing' else 500_000
        if isinstance(p.budget, int) and p.budget > eighth_cap:
            required_keys.append('eighth')
        if isinstance(p.loan, int) and 1_000_000 < p.loan <= 2_000_000:
            required_keys.append('repaid')
    if 'college' in active_goals:
        for k in ('income', 'percentile', 'regular', 'gap', 'aid'):
            if k not in required_keys:
                required_keys.append(k)
    if 'school' in active_goals:
        for k in ('grade', 'income', 'school_type', 'marks'):
            if k not in required_keys:
                required_keys.append(k)

    raw_map = p.model_dump()
    missing_fields = []
    filled_count = 0
    for k in required_keys:
        v = raw_map.get(k)
        if isinstance(v, str):
            v_clean = v.strip()
            is_filled = bool(v_clean) and v_clean != UNKNOWN
        else:
            is_filled = v is not None
        if is_filled:
            filled_count += 1
        else:
            missing_fields.append({'key': k, 'label': FIELD_LABELS[k]})

    total_count = len(required_keys)
    completion = round(100 * filled_count / total_count) if total_count else 100
    if completion >= 85:
        level, level_label = 'ready', text('Profile ready to apply', 'आवेदन के लिए प्रोफ़ाइल तैयार')
    elif completion >= 40:
        level, level_label = 'in_progress', text('Profile in progress', 'प्रोफ़ाइल अधूरी है — कुछ विवरण बाकी')
    else:
        level, level_label = 'starter', text('Complete your profile to unlock matches', 'सटीक योजनाओं के लिए प्रोफ़ाइल पूरी करें')

    unique_doc_ids: list[str] = []
    for item in sorted_results:
        for d in item['required_documents']:
            if d['id'] not in unique_doc_ids:
                unique_doc_ids.append(d['id'])
    docs_ready_count = sum(1 for dk in unique_doc_ids if dk in docs_set)

    match_counts = {
        'match': sum(1 for r in sorted_results if r['status'] == 'match'),
        'near_miss': sum(1 for r in sorted_results if r['status'] == 'near_miss'),
        'needs_info': sum(1 for r in sorted_results if r['status'] == 'needs_info'),
        'not_matched': sum(1 for r in sorted_results if r['status'] == 'not_matched'),
    }

    status_summary = {
        'completion_percent': completion,
        'filled_count': filled_count,
        'total_count': total_count,
        'level': level,
        'level_label': level_label,
        'missing_fields': missing_fields,
        'docs_ready_count': docs_ready_count,
        'docs_total_count': len(unique_doc_ids),
        'active_goals': active_goals,
        'match_counts': match_counts,
    }
    return sorted_results, status_summary


@router.post('/profile-match')
def profile_match(req: ProfileMatchRequest, response: Response):
    response.headers['Cache-Control'] = 'no-store'
    _validate_numeric_bounds(req.profile)
    lang = req.language
    raw_results, raw_status = _evaluate_profile_schemes(req.profile)
    results = localize(raw_results, lang)
    profile_status = localize(raw_status, lang)
    generated = date.today().isoformat()
    return dict(
        profile_status=profile_status,
        results=results,
        date=generated,
        disclaimer=DISCLAIMER[lang],
        labels=localize(REPORT_LABELS, lang),
        doc_labels=localize(DOC_LABELS, lang),
        report=build_report(results, lang, generated),
    )
