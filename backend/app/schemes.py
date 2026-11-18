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
