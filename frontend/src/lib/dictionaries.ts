// Frontend mirrors of the backend extraction dictionaries (see backend/app/extraction.py).
// Kept in sync manually so resume parsing and job extraction speak the same vocabulary.

export const SKILLS: string[] = [
 'machine learning','deep learning','data science','data analysis','power bi','google analytics',
 'digital marketing','content writing','project management','product management','business development',
 'human resources','ui/ux design','ui design','ux design','graphic design','embedded systems','rest api',
 'node.js','next.js','express.js','spring boot','react','angular','vue','django','flask','flutter',
 'tensorflow','pytorch','pandas','numpy','tableau','docker','kubernetes','aws','azure','gcp','redis',
 'postgresql','mongodb','mysql','sql','nosql','graphql','tailwind','html','css','javascript','typescript',
 'python','java','kotlin','swift','rust','php','ruby','golang','c++','c#','git','linux','matlab',
 'autocad','solidworks','figma','canva','excel','statistics','seo','sem','communication','teamwork',
 'leadership','problem solving','presentation skills','ms office',
]

export const ROLE_PATTERNS: { label: string; patterns: string[] }[] = [
 { label: 'Frontend Developer', patterns: ['frontend developer','front end developer','frontend engineer','ui developer','front-end developer'] },
 { label: 'Backend Developer', patterns: ['backend developer','back end developer','backend engineer','back-end developer'] },
 { label: 'Full Stack Developer', patterns: ['full stack developer','full-stack developer','full stack engineer','full-stack engineer'] },
 { label: 'Software Engineer', patterns: ['software engineer','software developer','sde','software development engineer','programmer analyst'] },
 { label: 'Data Analyst', patterns: ['data analyst','business analyst','analytics intern','analytics engineer'] },
 { label: 'Data Scientist', patterns: ['data scientist'] },
 { label: 'Data Engineer', patterns: ['data engineer'] },
 { label: 'Product Manager', patterns: ['product manager','product management','pm intern','associate product'] },
 { label: 'UX/UI Designer', patterns: ['ux designer','ui designer','ux/ui designer','ui/ux designer','product designer','user experience designer'] },
 { label: 'Graphic Designer', patterns: ['graphic designer','visual designer'] },
 { label: 'Marketing', patterns: ['digital marketing','marketing intern','marketing executive','marketing manager','marketing associate','seo executive'] },
 { label: 'Content Writer', patterns: ['content writer','content writing','technical writer','copywriter'] },
 { label: 'Business Development', patterns: ['business development','bd executive','sales intern','sales executive','business development executive'] },
 { label: 'Human Resources', patterns: ['human resources','hr intern','hr executive','hr recruiter','talent acquisition','hr generalist'] },
 { label: 'DevOps Engineer', patterns: ['devops','site reliability engineer','sre engineer','cloud engineer'] },
 { label: 'QA Engineer', patterns: ['qa engineer','test engineer','quality analyst','software tester','quality assurance'] },
 { label: 'Mobile App Developer', patterns: ['android developer','ios developer','mobile app developer','flutter developer','mobile developer'] },
 { label: 'Graduate Engineer Trainee', patterns: ['graduate engineer trainee','management trainee','graduate trainee'] },
 { label: 'Research Intern', patterns: ['research intern','research assistant','research fellow'] },
 { label: 'Finance Analyst', patterns: ['finance intern','finance analyst','accounts executive','financial analyst'] },
 { label: 'Operations Executive', patterns: ['operations intern','operations executive','operations analyst'] },
]

export const CITY_ALIASES: Record<string, string> = {
 bangalore: 'Bengaluru', bengaluru: 'Bengaluru', mumbai: 'Mumbai', 'new delhi': 'New Delhi', delhi: 'New Delhi',
 hyderabad: 'Hyderabad', pune: 'Pune', chennai: 'Chennai', kolkata: 'Kolkata', gurugram: 'Gurugram',
 gurgaon: 'Gurugram', noida: 'Noida', ahmedabad: 'Ahmedabad', jaipur: 'Jaipur', chandigarh: 'Chandigarh',
 kochi: 'Kochi', indore: 'Indore', nagpur: 'Nagpur', coimbatore: 'Coimbatore', lucknow: 'Lucknow',
 bhopal: 'Bhopal', visakhapatnam: 'Visakhapatnam', vadodara: 'Vadodara', nashik: 'Nashik',
 mysuru: 'Mysuru', mysore: 'Mysuru', remote: 'Remote', 'work from home': 'Remote',
}

export const DEGREE_PATTERNS: { label: string; patterns: RegExp }[] = [
 { label: 'B.Tech / B.E.', patterns: /b\.?\s?tech|bachelor of (engineering|technology)|b\.?e\.?\b/ },
 { label: 'M.Tech', patterns: /m\.?\s?tech|master of (engineering|technology)/ },
 { label: 'BCA', patterns: /\bbca\b|bachelor of computer applications/ },
 { label: 'MCA', patterns: /\bmca\b|master of computer applications/ },
 { label: 'B.Sc', patterns: /b\.?sc\.?\b|bachelor of science/ },
 { label: 'M.Sc', patterns: /m\.?sc\.?\b|master of science/ },
 { label: 'B.Com', patterns: /b\.?com\.?\b|bachelor of commerce/ },
 { label: 'BBA', patterns: /\bbba\b|bachelor of business administration/ },
 { label: 'MBA', patterns: /\bmba\b|master of business administration/ },
]
