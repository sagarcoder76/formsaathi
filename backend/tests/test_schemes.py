import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
PATH = '/api/schemes/intake'


def step(answers, language='en', explain=False):
    response = client.post(PATH, json={'answers': answers, 'language': language, 'explain': explain})
    assert response.status_code == 200, response.text
    assert response.headers['cache-control'] == 'no-store'
    return response.json()


def business(**kwargs):
    return dict(goal='business', age=20, stage='new', sector='manufacturing', budget=1_000_000, loan=500_000) | kwargs


def test_adaptive_business_rank_and_report():
    assert step({})['question']['id'] == 'goal'
    a = business()
    assert step(a)['question']['id'] == 'subsidy'
    report = step(a | {'subsidy': 'no'})
    assert [r['id'] for r in report['results']] == ['pmegp', 'mudra']
    assert all(r['status'] == 'match' for r in report['results'])
    assert 'Kishore' in report['report']
    assert step(a | {'budget': 1_000_001})['question']['id'] == 'eighth'


def test_tarun_plus_and_maximum_questions():
    a = business(budget=2_000_000, loan=1_000_001)
    assert step(a | {'eighth': 'yes'})['question']['id'] == 'repaid'
    r = step(a | {'eighth': 'yes', 'repaid': 'no'})['results']
    assert {s['id']: s['status'] for s in r} == {'pmegp': 'needs_info', 'mudra': 'near_miss'}
    assert step(a | {'eighth': 'yes', 'repaid': 'yes'})['results'][0]['status'] == 'match'


def test_unknown_numeric_answers_remain_unknown():
    report = step(business(budget='unknown', loan='unknown', subsidy='no'))
    assert all(r['status'] == 'needs_info' for r in report['results'])


def test_college_income_boundary_and_hindi():
    a = dict(goal='college', income=450_000, percentile='yes', regular='yes', gap='no', aid='no')
    assert step(a)['results'][0]['status'] == 'match'
    r = step(a | {'income': 450_001}, 'hi')
    assert r['results'][0]['status'] == 'near_miss'
    assert 'योजना रिपोर्ट' in r['report']
    assert [c['status'] for c in r['results'][0]['checks']].count('fail') == 1


def test_school_screen_and_unknown():
    a = dict(goal='school', grade=8, income=350_000, school_type='yes', marks='yes')
    assert step(a)['results'][0]['status'] == 'match'
    assert step(a | {'marks': 'unknown'})['results'][0]['status'] == 'needs_info'
    assert step(a | {'grade': 9, 'income': 350_001})['results'][0]['status'] == 'not_matched'


@pytest.mark.parametrize('answers', [{'age': 30}, {'goal': 'other'}, {'goal': 'business', 'age': True},
                                     {'goal': 'business', 'age': '18'}, {'goal': 'school', 'income': 90}])
def test_invalid_answers_rejected(answers):
    assert client.post(PATH, json={'answers': answers}).status_code == 422


def test_ai_failure_does_not_change_decision(monkeypatch):
    monkeypatch.setenv('SCHEME_OPENAI_API_KEY', 'test-placeholder')
    monkeypatch.setattr('app.schemes.explain_report', lambda *_: None)
    a = dict(goal='school', grade=8, income=350_000, school_type='yes', marks='yes')
    r = step(a, explain=True)
    assert r['ai_failed'] and r['results'] == step(a)['results']


def test_profile_match_multi_goal_status_and_prefill():
    empty = client.post('/api/schemes/profile-match', json={'language': 'en', 'profile': {}}).json()
    assert empty['profile_status']['completion_percent'] == 0
    assert empty['profile_status']['level'] == 'starter'
    assert {r['id'] for r in empty['results']} == {'pmegp', 'mudra', 'csss', 'nmmss'}

    ready = client.post('/api/schemes/profile-match', json={
        'language': 'en',
        'profile': {
            'full_name': 'Aarav Sharma',
            'state': 'Haryana',
            'category': 'obc',
            'goals': ['college', 'business'],
            'age': 21,
            'income': 320_000,
            'percentile': 'yes',
            'regular': 'yes',
            'gap': 'no',
            'aid': 'no',
            'stage': 'new',
            'sector': 'service',
            'budget': 800_000,
            'loan': 400_000,
            'eighth': 'yes',
            'subsidy': 'no',
            'documents': ['identity_address', 'bank_passbook', 'income_certificate', 'marksheets', 'bonafide_admission', 'business_plan', 'category_certificate'],
        },
    })
    assert ready.status_code == 200
    body = ready.json()
    assert body['profile_status']['completion_percent'] == 100
    assert body['profile_status']['level'] == 'ready'
    assert body['profile_status']['missing_fields'] == []
    assert body['profile_status']['match_counts']['match'] == 3
    csss = next(r for r in body['results'] if r['id'] == 'csss')
    assert csss['status'] == 'match'
    assert all(d['ready'] for d in csss['required_documents'])
    income_field = next(f for f in csss['prefill_fields'] if f['key'] == 'income')
    assert income_field['value'] == '₹3,20,000' and income_field['ready'] is True


def test_profile_match_hindi_and_validation():
    hi = client.post('/api/schemes/profile-match', json={
        'language': 'hi',
        'profile': {'goals': ['school'], 'grade': 8, 'income': 250_000, 'school_type': 'yes', 'marks': 'yes'},
    }).json()
    assert hi['results'][0]['id'] == 'nmmss'
    assert hi['results'][0]['status'] == 'match'
    assert 'योजना रिपोर्ट' in hi['report']

    bad = client.post('/api/schemes/profile-match', json={'profile': {'age': 200}})
    assert bad.status_code == 422
