"""TinyFish client — verified against https://docs.tinyfish.ai (2026-10-16)
Search: GET https://api.search.tinyfish.ai?query=&location=IN&language=en  Header X-API-Key
Fetch:  POST https://api.fetch.tinyfish.ai {urls[], format, links} Header X-API-Key (max 10 urls)
Agent:  POST https://agent.tinyfish.ai/v1/automation/run {url, goal, output_schema} Header X-API-Key
"""
import os, httpx

SEARCH_URL="https://api.search.tinyfish.ai"
FETCH_URL="https://api.fetch.tinyfish.ai"
AGENT_URL="https://agent.tinyfish.ai/v1/automation/run"

def api_key(): return os.getenv("TINYFISH_API_KEY","").strip()
def has_key(): 
    k=api_key(); return bool(k and k!="your_key_here")

def _headers(): return {"X-API-Key": api_key(), "Content-Type":"application/json"}

async def search(query:str, location:str="IN"):
    params={"query":query,"location":location,"language":"en","purpose":"Find legitimate student opportunities in India with official application pages"}
    async with httpx.AsyncClient(timeout=30) as c:
        r=await c.get(SEARCH_URL, params=params, headers=_headers()); r.raise_for_status()
        data=r.json()
    out=[]
    for item in data.get("results",[]):
        url=item.get("url")
        if not url: continue
        out.append({"title":item.get("title") or "Untitled","url":url,"snippet":item.get("snippet") or "","site_name":item.get("site_name") or "","date":item.get("date")})
    return out

async def fetch_urls(urls:list[str]):
    async with httpx.AsyncClient(timeout=60) as c:
        r=await c.post(FETCH_URL, json={"urls":urls[:10],"format":"markdown","links":True,"purpose":"Extract opportunity eligibility, deadline, organizer, fee and official application link"}, headers=_headers()); r.raise_for_status()
        return r.json()

async def agent_extract(url:str):
    schema={"type":"object","properties":{"title":{"type":"string"},"organizer":{"type":"string"},"eligibility":{"type":"array","items":{"type":"string"}},"deadline":{"type":"string"},"fees":{"type":"string"},"application_url":{"type":"string"},"location":{"type":"string"},"mode":{"type":"string"}},"required":[]}
    goal=("Inspect this publicly accessible opportunity page. Find the eligibility criteria, application deadline, organizer, participation fee, and official application link. "
          "Return the extracted information as structured JSON. If any field is missing, return null rather than guessing. Include the source URL. Do not submit any application, do not bypass CAPTCHA or login.")
    async with httpx.AsyncClient(timeout=120) as c:
        r=await c.post(AGENT_URL, json={"url":url,"goal":goal,"output_schema":schema,"browser_profile":"lite"}, headers=_headers()); r.raise_for_status()
        data=r.json()
    return data.get("result") if isinstance(data,dict) else None
