export const SUBJECTS = [
  {
    id:'tech', label:'Technology', icon:'💻', count:'48 workshops',
    color:'#E8F4FF', accent:'#1A6BB8',
    desc:'From beginner coding to advanced AI — tech skills that get you hired.',
    sections:[
      { title:'Artificial Intelligence', items:[
          {icon:'🤖',name:'ChatGPT & Prompt Engineering',meta:'6 hrs · Beginner',tag:'live',tagLabel:'Live'},
          {icon:'🧠',name:'Machine Learning with Python',meta:'12 hrs · Intermediate',tag:'rec',tagLabel:'Recorded'},
          {icon:'🎨',name:'Generative AI & Midjourney',meta:'4 hrs · Beginner',tag:'live',tagLabel:'Live'},
          {icon:'🔗',name:'Build AI Agents with LangChain',meta:'8 hrs · Advanced',tag:'new',tagLabel:'New'},
      ]},
      { title:'Programming', items:[
          {icon:'🐍',name:'Python Zero to Hero',meta:'10 hrs · Beginner',tag:'live',tagLabel:'Live'},
          {icon:'🌐',name:'Full Stack Web Development',meta:'20 hrs · Intermediate',tag:'rec',tagLabel:'Recorded'},
          {icon:'📱',name:'Flutter Mobile App Dev',meta:'14 hrs · Intermediate',tag:'new',tagLabel:'New'},
          {icon:'⚙️',name:'Data Structures & Algorithms',meta:'16 hrs · Advanced',tag:'rec',tagLabel:'Recorded'},
      ]},
      { title:'Cybersecurity', items:[
          {icon:'🔐',name:'Ethical Hacking Masterclass',meta:'12 hrs · All levels',tag:'live',tagLabel:'Live'},
          {icon:'🛡️',name:'VAPT & Penetration Testing',meta:'10 hrs · Advanced',tag:'rec',tagLabel:'Recorded'},
          {icon:'🔍',name:'Digital Forensics Basics',meta:'6 hrs · Beginner',tag:'new',tagLabel:'New'},
          {icon:'☁️',name:'Cloud Security on AWS',meta:'8 hrs · Intermediate',tag:'live',tagLabel:'Live'},
      ]},
      { title:'Data & Analytics', items:[
          {icon:'📊',name:'Excel & Power BI for Business',meta:'8 hrs · Beginner',tag:'live',tagLabel:'Live'},
          {icon:'🗄️',name:'SQL for Data Analysis',meta:'6 hrs · Beginner',tag:'rec',tagLabel:'Recorded'},
          {icon:'📈',name:'Data Visualisation with Python',meta:'8 hrs · Intermediate',tag:'new',tagLabel:'New'},
          {icon:'🤿',name:'Big Data & Spark Essentials',meta:'10 hrs · Advanced',tag:'rec',tagLabel:'Recorded'},
      ]},
    ]
  },
  {
    id:'culture', label:'Culture & Arts', icon:'🎭', count:'36 workshops',
    color:'#FFF0F5', accent:'#B83060',
    desc:'Music, film, language, literature — feed the creative soul.',
    sections:[
      { title:'Music', items:[
          {icon:'🎸',name:'Guitar for Complete Beginners',meta:'5 hrs · Beginner',tag:'live',tagLabel:'Live'},
          {icon:'🎹',name:'Piano Foundations',meta:'8 hrs · Beginner',tag:'rec',tagLabel:'Recorded'},
          {icon:'🎤',name:'Bollywood Vocal Training',meta:'6 hrs · All levels',tag:'live',tagLabel:'Live'},
          {icon:'🎧',name:'Music Production & DAW',meta:'10 hrs · Intermediate',tag:'new',tagLabel:'New'},
      ]},
      { title:'Visual Arts & Film', items:[
          {icon:'🎬',name:'Filmmaking & Storytelling',meta:'8 hrs · Beginner',tag:'live',tagLabel:'Live'},
          {icon:'✏️',name:'Sketching & Illustration',meta:'5 hrs · Beginner',tag:'rec',tagLabel:'Recorded'},
          {icon:'🖌️',name:'Watercolour Painting',meta:'6 hrs · All levels',tag:'new',tagLabel:'New'},
          {icon:'📸',name:'Street Photography Masterclass',meta:'4 hrs · Intermediate',tag:'live',tagLabel:'Live'},
      ]},
      { title:'Language & Literature', items:[
          {icon:'🗣️',name:'Public Speaking Confidence',meta:'4 hrs · All levels',tag:'live',tagLabel:'Live'},
          {icon:'✍️',name:'Creative Writing Workshop',meta:'6 hrs · Beginner',tag:'rec',tagLabel:'Recorded'},
          {icon:'🌏',name:'Japanese for Beginners',meta:'8 hrs · Beginner',tag:'new',tagLabel:'New'},
          {icon:'📖',name:'Storytelling for Kids',meta:'3 hrs · Beginner',tag:'live',tagLabel:'Live'},
      ]},
    ]
  },
  {
    id:'environment', label:'Environment', icon:'🌿', count:'22 workshops',
    color:'#F0FFF4', accent:'#1A7A40',
    desc:'Sustainability, gardening, clean energy — learn to live better on Earth.',
    sections:[
      { title:'Sustainable Living', items:[
          {icon:'♻️',name:'Zero Waste Home Practices',meta:'3 hrs · Beginner',tag:'live',tagLabel:'Live'},
          {icon:'☀️',name:'Solar Energy for Homeowners',meta:'5 hrs · Beginner',tag:'rec',tagLabel:'Recorded'},
          {icon:'🌱',name:'Composting & Organic Farming',meta:'4 hrs · All levels',tag:'new',tagLabel:'New'},
          {icon:'💧',name:'Water Conservation Methods',meta:'3 hrs · Beginner',tag:'live',tagLabel:'Live'},
      ]},
      { title:'Gardening & Nature', items:[
          {icon:'🪴',name:'Home & Balcony Gardening',meta:'4 hrs · Beginner',tag:'live',tagLabel:'Live'},
          {icon:'🌻',name:'Terrace Kitchen Garden',meta:'5 hrs · All levels',tag:'rec',tagLabel:'Recorded'},
          {icon:'🐝',name:'Urban Beekeeping Basics',meta:'4 hrs · Intermediate',tag:'new',tagLabel:'New'},
          {icon:'🦋',name:'Butterfly Garden Design',meta:'3 hrs · Beginner',tag:'live',tagLabel:'Live'},
      ]},
      { title:'Eco Careers', items:[
          {icon:'🌍',name:'ESG & Green Finance',meta:'6 hrs · Intermediate',tag:'new',tagLabel:'New'},
          {icon:'📋',name:'Environmental Impact Assessment',meta:'8 hrs · Advanced',tag:'rec',tagLabel:'Recorded'},
          {icon:'🏙️',name:'Sustainable Architecture 101',meta:'5 hrs · Beginner',tag:'live',tagLabel:'Live'},
          {icon:'🔋',name:'EV & Clean Tech Industry',meta:'4 hrs · Beginner',tag:'new',tagLabel:'New'},
      ]},
    ]
  },
  {
    id:'lifeskills', label:'Life Skills', icon:'🧘', count:'40 workshops',
    color:'#FFF8F0', accent:'#C06010',
    desc:'Wellness, cooking, mindfulness, parenting — real skills for a fuller life.',
    sections:[
      { title:'Wellness & Fitness', items:[
          {icon:'🧘',name:'Mindfulness & Meditation',meta:'4 hrs · Beginner',tag:'live',tagLabel:'Live'},
          {icon:'🏃',name:'Home Workout Fundamentals',meta:'5 hrs · All levels',tag:'rec',tagLabel:'Recorded'},
          {icon:'🌬️',name:'Pranayama & Breathwork',meta:'3 hrs · Beginner',tag:'live',tagLabel:'Live'},
          {icon:'💤',name:'Sleep Science & Better Rest',meta:'2 hrs · All levels',tag:'new',tagLabel:'New'},
      ]},
      { title:'Cooking & Nutrition', items:[
          {icon:'👨🍳',name:'Indian Home Cooking Masterclass',meta:'8 hrs · Beginner',tag:'live',tagLabel:'Live'},
          {icon:'🥗',name:'Nutrition for Busy Professionals',meta:'4 hrs · All levels',tag:'rec',tagLabel:'Recorded'},
          {icon:'🍱',name:'Meal Prep & Batch Cooking',meta:'3 hrs · Beginner',tag:'new',tagLabel:'New'},
          {icon:'🎂',name:'Baking & Pastry at Home',meta:'6 hrs · All levels',tag:'live',tagLabel:'Live'},
      ]},
      { title:'Relationships & Parenting', items:[
          {icon:'👪',name:'Conscious Parenting',meta:'4 hrs · All levels',tag:'live',tagLabel:'Live'},
          {icon:'💬',name:'Communication in Relationships',meta:'3 hrs · All levels',tag:'rec',tagLabel:'Recorded'},
          {icon:'🎮',name:'Mindful Screen Time for Kids',meta:'2 hrs · Parents',tag:'new',tagLabel:'New'},
          {icon:'🧒',name:'Child Development 0–6 Years',meta:'5 hrs · Parents',tag:'live',tagLabel:'Live'},
      ]},
    ]
  },
  {
    id:'money', label:'Money & Career', icon:'💰', count:'30 workshops',
    color:'#FFFBF0', accent:'#8A6800',
    desc:'Personal finance, investing, freelancing, and career growth — own your future.',
    sections:[
      { title:'Personal Finance', items:[
          {icon:'📈',name:'Investing for Indians — Stocks & MF',meta:'6 hrs · Beginner',tag:'live',tagLabel:'Live'},
          {icon:'🏠',name:'Real Estate Investment Basics',meta:'5 hrs · Beginner',tag:'rec',tagLabel:'Recorded'},
          {icon:'💳',name:'Credit Score & Debt Freedom',meta:'3 hrs · All levels',tag:'new',tagLabel:'New'},
          {icon:'🪙',name:'Crypto & Blockchain Decoded',meta:'4 hrs · Intermediate',tag:'live',tagLabel:'Live'},
      ]},
      { title:'Career & Freelancing', items:[
          {icon:'💼',name:'Freelancing — Getting Started',meta:'4 hrs · Beginner',tag:'live',tagLabel:'Live'},
          {icon:'🤝',name:'LinkedIn & Personal Branding',meta:'3 hrs · All levels',tag:'rec',tagLabel:'Recorded'},
          {icon:'📝',name:'Resume & Interview Masterclass',meta:'4 hrs · All levels',tag:'new',tagLabel:'New'},
          {icon:'🚀',name:'Starting a Side Business',meta:'6 hrs · Beginner',tag:'live',tagLabel:'Live'},
      ]},
      { title:'Entrepreneurship', items:[
          {icon:'💡',name:'From Idea to MVP in 30 Days',meta:'8 hrs · Intermediate',tag:'live',tagLabel:'Live'},
          {icon:'📊',name:'Business Finance for Founders',meta:'5 hrs · Beginner',tag:'rec',tagLabel:'Recorded'},
          {icon:'🎯',name:'Marketing on Zero Budget',meta:'4 hrs · Beginner',tag:'new',tagLabel:'New'},
          {icon:'📣',name:'Pitching to Investors',meta:'3 hrs · Advanced',tag:'live',tagLabel:'Live'},
      ]},
    ]
  },
];

export const CAT_DATA: Record<string, any> = {
  ai:{
    label:'Artificial Intelligence',icon:'🤖',
    desc:'From no-code prompting to building full AI agents — the most in-demand skill category of our decade. Whether you want to use AI tools smarter or build with them, this is your starting point.',
    workshops:24,learners:'8,400+',rating:'4.9',hours:'180+',
    sections:[
      {
        title:'For Beginners',desc:'Start here — no coding required',
        courses:[
          {emoji:'💬',bg:'ct-ai',level:'Beginner',name:'ChatGPT & Prompt Engineering',instructor:'Ananya Sharma',rating:'4.9',dur:'6 hrs',price:'₹1,299',badge:'pop',badgeLabel:'Most Popular'},
          {emoji:'🎨',bg:'ct-ai',level:'Beginner',name:'AI Image Generation with Midjourney',instructor:'Vikram Nair',rating:'4.8',dur:'4 hrs',price:'₹999',badge:'new',badgeLabel:'New'},
          {emoji:'📝',bg:'ct-ai',level:'Beginner',name:'AI Writing & Content Creation',instructor:'Meera Iyer',rating:'4.7',dur:'3 hrs',price:'₹799',badge:'rec',badgeLabel:'Recorded'},
        ]
      },
      {
        title:'Build & Deploy',desc:'Hands-on AI development for coders',
        courses:[
          {emoji:'🔗',bg:'ct-ai',level:'Intermediate',name:'Build AI Agents with LangChain',instructor:'Dr. Rohan Kapoor',rating:'4.8',dur:'8 hrs',price:'₹2,499',badge:'live',badgeLabel:'Live'},
          {emoji:'🧠',bg:'ct-ai',level:'Intermediate',name:'Machine Learning with Python',instructor:'Priya Pillai',rating:'4.8',dur:'12 hrs',price:'₹3,299',badge:'rec',badgeLabel:'Recorded'},
          {emoji:'🤗',bg:'ct-ai',level:'Advanced',name:'Fine-tuning LLMs & Hugging Face',instructor:'Aditya Menon',rating:'4.7',dur:'10 hrs',price:'₹3,999',badge:'new',badgeLabel:'New'},
        ]
      },
      {
        title:'AI for Your Industry',desc:'Sector-specific AI applications',
        courses:[
          {emoji:'🏥',bg:'ct-ai',level:'Intermediate',name:'AI in Healthcare & Diagnostics',instructor:'Dr. Sonal Gupta',rating:'4.9',dur:'6 hrs',price:'₹2,199',badge:'live',badgeLabel:'Live'},
          {emoji:'💰',bg:'ct-ai',level:'Intermediate',name:'AI for Finance & Trading',instructor:'Rahul Shetty',rating:'4.7',dur:'7 hrs',price:'₹2,499',badge:'rec',badgeLabel:'Recorded'},
        ]
      }
    ]
  },
  programming:{
    label:'Programming',icon:'💻',
    desc:'Learn to code from scratch or advance your skills. From Python and web development to mobile apps and algorithms — practical coding workshops that get you building real things.',
    workshops:18,learners:'12,200+',rating:'4.8',hours:'220+',
    sections:[
      {
        title:'Web Development',desc:'Build websites and web applications',
        courses:[
          {emoji:'🌐',bg:'ct-py',level:'Beginner',name:'HTML, CSS & JavaScript Fundamentals',instructor:'Kartik Patel',rating:'4.7',dur:'12 hrs',price:'₹1,499',badge:'rec',badgeLabel:'Recorded'},
          {emoji:'⚛️',bg:'ct-py',level:'Intermediate',name:'React.js — Modern Web Apps',instructor:'Swati Reddy',rating:'4.8',dur:'14 hrs',price:'₹2,999',badge:'live',badgeLabel:'Live'},
          {emoji:'🔧',bg:'ct-py',level:'Intermediate',name:'Node.js & Express Backend',instructor:'Nikhil Arora',rating:'4.7',dur:'10 hrs',price:'₹2,499',badge:'new',badgeLabel:'New'},
        ]
      },
      {
        title:'Python & Data',desc:'The most in-demand language in the world',
        courses:[
          {emoji:'🐍',bg:'ct-py',level:'Beginner',name:'Python Zero to Hero',instructor:'Deepa Krishnan',rating:'4.9',dur:'10 hrs',price:'₹1,799',badge:'pop',badgeLabel:'Most Popular'},
          {emoji:'📊',bg:'ct-py',level:'Intermediate',name:'Data Analysis with Pandas & NumPy',instructor:'Arjun Singh',rating:'4.8',dur:'8 hrs',price:'₹2,199',badge:'rec',badgeLabel:'Recorded'},
        ]
      },
      {
        title:'Mobile & More',desc:'Apps and advanced topics',
        courses:[
          {emoji:'📱',bg:'ct-py',level:'Intermediate',name:'Flutter Mobile App Development',instructor:'Riya Shah',rating:'4.8',dur:'14 hrs',price:'₹2,999',badge:'new',badgeLabel:'New'},
          {emoji:'⚙️',bg:'ct-py',level:'Advanced',name:'Data Structures & Algorithms',instructor:'Varun Tiwari',rating:'4.7',dur:'16 hrs',price:'₹3,499',badge:'rec',badgeLabel:'Recorded'},
        ]
      }
    ]
  },
  cybersecurity:{
    label:'Cybersecurity',icon:'🔐',
    desc:'Protect systems, ethically hack to find vulnerabilities, and build a career in one of the fastest-growing and highest-paying fields in tech. Learn from certified professionals.',
    workshops:12,learners:'4,800+',rating:'4.9',hours:'140+',
    sections:[
      {
        title:'Ethical Hacking',desc:'Learn to think like an attacker',
        courses:[
          {emoji:'🔓',bg:'ct-cy',level:'All levels',name:'Ethical Hacking Masterclass',instructor:'Arjun Mehta',rating:'4.9',dur:'12 hrs',price:'₹2,999',badge:'pop',badgeLabel:'Most Popular'},
          {emoji:'🛡️',bg:'ct-cy',level:'Advanced',name:'VAPT & Penetration Testing',instructor:'Kavya Menon',rating:'4.8',dur:'10 hrs',price:'₹3,499',badge:'live',badgeLabel:'Live'},
          {emoji:'🐛',bg:'ct-cy',level:'Intermediate',name:'Bug Bounty Hunting',instructor:'Rohit Verma',rating:'4.7',dur:'8 hrs',price:'₹2,499',badge:'new',badgeLabel:'New'},
        ]
      },
      {
        title:'Defence & Compliance',desc:'Protect organisations and data',
        courses:[
          {emoji:'☁️',bg:'ct-cy',level:'Intermediate',name:'Cloud Security on AWS & Azure',instructor:'Sanjana Rao',rating:'4.8',dur:'8 hrs',price:'₹2,799',badge:'live',badgeLabel:'Live'},
          {emoji:'🔍',bg:'ct-cy',level:'Beginner',name:'Digital Forensics Fundamentals',instructor:'Prakash Iyer',rating:'4.7',dur:'6 hrs',price:'₹1,999',badge:'new',badgeLabel:'New'},
          {emoji:'📋',bg:'ct-cy',level:'Intermediate',name:'DPDPA & Cybersecurity Compliance',instructor:'Aditi Nair',rating:'4.8',dur:'5 hrs',price:'₹1,799',badge:'rec',badgeLabel:'Recorded'},
        ]
      }
    ]
  },
  data:{
    label:'Data & Analytics',icon:'📊',
    desc:'Turn raw numbers into decisions. Master Excel, Power BI, SQL, and Python for data — the skills every business craves and every analyst needs.',
    workshops:16,learners:'9,100+',rating:'4.8',hours:'160+',
    sections:[
      {
        title:'Essentials',desc:'Start with the most-used tools',
        courses:[
          {emoji:'📊',bg:'ct-da',level:'Beginner',name:'Excel Mastery — Beyond the Basics',instructor:'Kavitha Iyer',rating:'4.8',dur:'6 hrs',price:'₹999',badge:'pop',badgeLabel:'Most Popular'},
          {emoji:'📈',bg:'ct-da',level:'Beginner',name:'Power BI for Business Intelligence',instructor:'Shyam Rao',rating:'4.7',dur:'8 hrs',price:'₹1,799',badge:'live',badgeLabel:'Live'},
          {emoji:'🗄️',bg:'ct-da',level:'Beginner',name:'SQL for Data Analysis',instructor:'Preethi Kumar',rating:'4.8',dur:'6 hrs',price:'₹1,299',badge:'rec',badgeLabel:'Recorded'},
        ]
      },
      {
        title:'Advanced Analytics',desc:'Go deeper with Python and visualisation',
        courses:[
          {emoji:'🐍',bg:'ct-da',level:'Intermediate',name:'Data Analysis with Python & Pandas',instructor:'Rahul Menon',rating:'4.8',dur:'8 hrs',price:'₹2,199',badge:'new',badgeLabel:'New'},
          {emoji:'📉',bg:'ct-da',level:'Intermediate',name:'Data Visualisation with Plotly & Seaborn',instructor:'Anita Sharma',rating:'4.7',dur:'6 hrs',price:'₹1,799',badge:'rec',badgeLabel:'Recorded'},
          {emoji:'🤿',bg:'ct-da',level:'Advanced',name:'Big Data & Apache Spark',instructor:'Nitin Joshi',rating:'4.6',dur:'10 hrs',price:'₹3,299',badge:'rec',badgeLabel:'Recorded'},
        ]
      }
    ]
  },
  design:{
    label:'Design & Creativity',icon:'🎨',
    desc:'Design is problem-solving made beautiful. From UI/UX to graphic design and brand identity — learn to create experiences people love using industry-standard tools.',
    workshops:14,learners:'5,600+',rating:'4.8',hours:'130+',
    sections:[
      {
        title:'UI/UX Design',desc:'Design digital products people love',
        courses:[
          {emoji:'🖼️',bg:'ct-de',level:'Beginner',name:'UI/UX Design with Figma — Full Course',instructor:'Suhani Mehta',rating:'4.8',dur:'9 hrs',price:'₹1,999',badge:'pop',badgeLabel:'Most Popular'},
          {emoji:'🔬',bg:'ct-de',level:'Intermediate',name:'User Research & Usability Testing',instructor:'Aryan Bose',rating:'4.7',dur:'6 hrs',price:'₹1,599',badge:'live',badgeLabel:'Live'},
          {emoji:'📐',bg:'ct-de',level:'Intermediate',name:'Design Systems & Component Libraries',instructor:'Neha Pillai',rating:'4.8',dur:'7 hrs',price:'₹2,199',badge:'new',badgeLabel:'New'},
        ]
      },
      {
        title:'Graphic & Brand Design',desc:'Visual communication mastery',
        courses:[
          {emoji:'🎭',bg:'ct-de',level:'Beginner',name:'Canva for Business & Social Media',instructor:'Pooja Sharma',rating:'4.7',dur:'4 hrs',price:'₹799',badge:'rec',badgeLabel:'Recorded'},
          {emoji:'🖋️',bg:'ct-de',level:'Intermediate',name:'Brand Identity & Logo Design',instructor:'Kiran Menon',rating:'4.8',dur:'6 hrs',price:'₹1,799',badge:'live',badgeLabel:'Live'},
        ]
      }
    ]
  },
  photography:{
    label:'Photography',icon:'📸',
    desc:'From phone snaps to professional shoots — master light, composition, and storytelling. Whether you shoot weddings, streets, or reels, we have a workshop for you.',
    workshops:10,learners:'3,900+',rating:'4.7',hours:'80+',
    sections:[
      {
        title:'Camera & Technique',desc:'Master your equipment',
        courses:[
          {emoji:'📷',bg:'ct-ph',level:'Beginner',name:'DSLR Photography — Auto to Manual',instructor:'Raj Kumar',rating:'4.7',dur:'5 hrs',price:'₹1,299',badge:'pop',badgeLabel:'Most Popular'},
          {emoji:'💡',bg:'ct-ph',level:'Intermediate',name:'Lighting Mastery — Natural & Studio',instructor:'Ananya Rao',rating:'4.8',dur:'6 hrs',price:'₹1,799',badge:'live',badgeLabel:'Live'},
          {emoji:'🌆',bg:'ct-ph',level:'Intermediate',name:'Street & Travel Photography',instructor:'Vikram Das',rating:'4.7',dur:'4 hrs',price:'₹1,199',badge:'rec',badgeLabel:'Recorded'},
        ]
      },
      {
        title:'Editing & Video',desc:'Post-production and reels',
        courses:[
          {emoji:'✂️',bg:'ct-ph',level:'Beginner',name:'Lightroom & Photo Editing',instructor:'Priya Nair',rating:'4.8',dur:'5 hrs',price:'₹1,499',badge:'new',badgeLabel:'New'},
          {emoji:'🎬',bg:'ct-ph',level:'Beginner',name:'Reels & Short Video Creation',instructor:'Kavya Menon',rating:'4.7',dur:'4 hrs',price:'₹999',badge:'live',badgeLabel:'Live'},
        ]
      }
    ]
  },
  wellness:{
    label:'Lifestyle & Wellness',icon:'🪴',
    desc:'Your health is your wealth. Learn practical skills for a balanced, joyful life — from fitness and cooking to parenting and home skills.',
    workshops:20,learners:'7,200+',rating:'4.9',hours:'120+',
    sections:[
      {
        title:'Health & Fitness',desc:'Move, breathe, and feel better',
        courses:[
          {emoji:'🏃',bg:'ct-we',level:'Beginner',name:'Home Workout — No Equipment Needed',instructor:'Sunita Reddy',rating:'4.8',dur:'5 hrs',price:'₹799',badge:'live',badgeLabel:'Live'},
          {emoji:'🌬️',bg:'ct-we',level:'Beginner',name:'Pranayama & Breathwork',instructor:'Guru Anand',rating:'4.9',dur:'3 hrs',price:'₹699',badge:'pop',badgeLabel:'Most Popular'},
          {emoji:'💤',bg:'ct-we',level:'Beginner',name:'Sleep Science & Better Rest',instructor:'Dr. Preeti Jain',rating:'4.8',dur:'2 hrs',price:'₹599',badge:'new',badgeLabel:'New'},
        ]
      },
      {
        title:'Cooking & Home',desc:'Real skills for daily life',
        courses:[
          {emoji:'👨🍳',bg:'ct-we',level:'Beginner',name:'Indian Home Cooking Masterclass',instructor:'Chef Meera',rating:'4.9',dur:'8 hrs',price:'₹1,299',badge:'pop',badgeLabel:'Most Popular'},
          {emoji:'🍱',bg:'ct-we',level:'Beginner',name:'Meal Prep & Healthy Eating',instructor:'Aditi Kumar',rating:'4.8',dur:'3 hrs',price:'₹799',badge:'live',badgeLabel:'Live'},
        ]
      }
    ]
  },
  music:{
    label:'Music & Arts',icon:'🎵',
    desc:'Music is the language of the soul. Whether you want to sing, play guitar, produce beats, or paint — every creative skill starts with showing up. Start yours here.',
    workshops:16,learners:'4,100+',rating:'4.7',hours:'110+',
    sections:[
      {
        title:'Instruments',desc:'Learn to play',
        courses:[
          {emoji:'🎸',bg:'ct-mu',level:'Beginner',name:'Guitar for Complete Beginners',instructor:'Arjun Rao',rating:'4.7',dur:'5 hrs',price:'₹999',badge:'live',badgeLabel:'Live'},
          {emoji:'🎹',bg:'ct-mu',level:'Beginner',name:'Piano — First 30 Days',instructor:'Leela Krishnan',rating:'4.8',dur:'6 hrs',price:'₹1,299',badge:'rec',badgeLabel:'Recorded'},
          {emoji:'🥁',bg:'ct-mu',level:'Beginner',name:'Tabla Basics for Adults',instructor:'Ustad Ravi',rating:'4.9',dur:'8 hrs',price:'₹1,499',badge:'new',badgeLabel:'New'},
        ]
      },
      {
        title:'Voice & Production',desc:'Sing and produce',
        courses:[
          {emoji:'🎤',bg:'ct-mu',level:'All levels',name:'Bollywood Vocal Training',instructor:'Nisha Malhotra',rating:'4.8',dur:'6 hrs',price:'₹1,199',badge:'live',badgeLabel:'Live'},
          {emoji:'🎧',bg:'ct-mu',level:'Intermediate',name:'Music Production — DAW & Beats',instructor:'DJ Karan',rating:'4.7',dur:'10 hrs',price:'₹2,299',badge:'rec',badgeLabel:'Recorded'},
        ]
      }
    ]
  },
  business:{
    label:'Business & Finance',icon:'💼',
    desc:'Whether you want to grow a side hustle, nail your finances, or build a startup from scratch — practical business skills that pay dividends for life.',
    workshops:14,learners:'6,800+',rating:'4.8',hours:'150+',
    sections:[
      {
        title:'Personal Finance',desc:'Take control of your money',
        courses:[
          {emoji:'📈',bg:'ct-bu',level:'Beginner',name:'Investing for Indians — Stocks & MF',instructor:'Neel Desai',rating:'4.8',dur:'6 hrs',price:'₹1,299',badge:'pop',badgeLabel:'Most Popular'},
          {emoji:'🏠',bg:'ct-bu',level:'Beginner',name:'Real Estate Investment Basics',instructor:'Prakash Mehta',rating:'4.7',dur:'5 hrs',price:'₹1,199',badge:'rec',badgeLabel:'Recorded'},
          {emoji:'💳',bg:'ct-bu',level:'Beginner',name:'Credit Score & Debt Freedom',instructor:'Rohini Shah',rating:'4.8',dur:'3 hrs',price:'₹799',badge:'new',badgeLabel:'New'},
        ]
      },
      {
        title:'Entrepreneurship',desc:'Build something of your own',
        courses:[
          {emoji:'💡',bg:'ct-bu',level:'Intermediate',name:'Startup MVP in 30 Days',instructor:'Ravi Shankar',rating:'4.7',dur:'8 hrs',price:'₹2,199',badge:'live',badgeLabel:'Live'},
          {emoji:'📣',bg:'ct-bu',level:'Intermediate',name:'Marketing on a Zero Budget',instructor:'Seema Nair',rating:'4.8',dur:'4 hrs',price:'₹1,199',badge:'rec',badgeLabel:'Recorded'},
          {emoji:'🎯',bg:'ct-bu',level:'Beginner',name:'Freelancing — Getting Started',instructor:'Karthik Ram',rating:'4.8',dur:'4 hrs',price:'₹999',badge:'live',badgeLabel:'Live'},
        ]
      }
    ]
  },
  mindfulness:{
    label:'Mindfulness',icon:'🧘',
    desc:'In a world of constant noise, mindfulness is a superpower. Learn practical techniques for stress relief, focus, emotional regulation, and inner calm — for all ages.',
    workshops:12,learners:'5,400+',rating:'4.9',hours:'90+',
    sections:[
      {
        title:'Meditation & Breath',desc:'Anchor yourself in the present',
        courses:[
          {emoji:'🧘',bg:'ct-mi',level:'Beginner',name:'Mindfulness & Meditation — 21 Days',instructor:'Meera Anand',rating:'4.9',dur:'4 hrs',price:'₹799',badge:'pop',badgeLabel:'Most Popular'},
          {emoji:'🌬️',bg:'ct-mi',level:'Beginner',name:'Pranayama for Stress & Anxiety',instructor:'Guruji Shiv',rating:'4.9',dur:'3 hrs',price:'₹699',badge:'live',badgeLabel:'Live'},
          {emoji:'😴',bg:'ct-mi',level:'Beginner',name:'Yoga Nidra — Deep Relaxation',instructor:'Nidhi Sharma',rating:'4.8',dur:'2 hrs',price:'₹599',badge:'new',badgeLabel:'New'},
        ]
      },
      {
        title:'Applied Mindfulness',desc:'Bring presence into daily life',
        courses:[
          {emoji:'👨👩👧',bg:'ct-mi',level:'Beginner',name:'Mindful Parenting',instructor:'Dr. Anita Rao',rating:'4.8',dur:'3 hrs',price:'₹799',badge:'live',badgeLabel:'Live'},
          {emoji:'🏢',bg:'ct-mi',level:'All levels',name:'Mindfulness at Work',instructor:'Priya Singh',rating:'4.7',dur:'2 hrs',price:'₹599',badge:'rec',badgeLabel:'Recorded'},
          {emoji:'👴',bg:'ct-mi',level:'Beginner',name:'Meditation for Senior Citizens',instructor:'Swami Rajan',rating:'4.9',dur:'4 hrs',price:'₹699',badge:'pop',badgeLabel:'Most Popular'},
        ]
      }
    ]
  }
};
