// ═══════════════════════════════════════════════════════
// CONFIGURATION & CONSTANTS
// ═══════════════════════════════════════════════════════

const OPENWEATHER_API_KEY = '9317cf1fd095795d69a65b6878d087b7';
const WEATHER_API_KEY = '34ae5a7f9cc44e6984c121615251105';

// AI API KEYS
const GROQ_API_KEY = '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';
const GEMINI_API_KEY = 'AIzaSyAALMl4fmRGc2hoq6D3pkTjrN-KoREOrmU';

// Backend API
const API_BASE = 'https://clifix-backend.onrender.com';

// WMO Codes Mapping
const WMO_EMOJI = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️', 61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '❄️', 73: '❄️', 75: '❄️', 77: '🌨️', 80: '🌦️', 81: '🌧️',
  82: '⛈️', 85: '❄️', 86: '❄️', 95: '⛈️', 96: '⛈️', 99: '⛈️'
};

const WMO_TEXT = {
  0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Icy Fog', 51: 'Light Drizzle', 53: 'Drizzle',
  55: 'Heavy Drizzle', 61: 'Slight Rain', 63: 'Moderate Rain', 65: 'Heavy Rain',
  71: 'Light Snow', 73: 'Moderate Snow', 75: 'Heavy Snow', 77: 'Snow Grains',
  80: 'Rain Showers', 81: 'Heavy Showers', 82: 'Violent Showers',
  95: 'Thunderstorm', 96: 'Thunderstorm+Hail', 99: 'Severe Thunderstorm'
};

// ECO ACTIONS (used by tracker)
const ECO_ACTIONS = {
  bike:           { name:'Bike Trip',          desc:'Instead of driving',       icon:'bicycle',       co2:2.1,  energy:0.5,  water:0,   points:10 },
  recycle:        { name:'Recycle Items',       desc:'Paper, plastic, glass',    icon:'recycle',       co2:1.0,  energy:1.2,  water:0,   points:5  },
  vegetarian:     { name:'Vegetarian Meal',     desc:'No meat or fish',          icon:'leaf',          co2:3.0,  energy:0.3,  water:15,  points:8  },
  publicTransport:{ name:'Public Transport',    desc:'Bus, train, subway',       icon:'bus',           co2:1.5,  energy:0.4,  water:0,   points:7  },
  reusable:       { name:'Reusable Items',      desc:'Bags, bottles, cups',      icon:'shopping-bag',  co2:0.5,  energy:0.1,  water:5,   points:4  },
  coldWash:       { name:'Cold Wash',           desc:'Laundry at 30°C',          icon:'tshirt',        co2:0.6,  energy:0.9,  water:0,   points:4  },
  carpool:        { name:'Carpooling',          desc:'Share your journey',       icon:'car',           co2:1.2,  energy:0.3,  water:0,   points:6  },
  solar:          { name:'Solar Power',         desc:'Used solar devices',       icon:'solar-panel',   co2:1.8,  energy:2.0,  water:0,   points:9  },
  plantTree:      { name:'Plant a Tree',        desc:'In your garden or yard',   icon:'tree',          co2:5.0,  energy:0,    water:10,  points:20 },
  shortShower:    { name:'Short Shower',        desc:'Under 5 minutes',          icon:'shower',        co2:0.3,  energy:0.5,  water:50,  points:5  },
};

const ACHIEVEMENTS = [
  { id:'starter',    name:'Green Starter',    desc:'Logged your first eco action',  icon:'seedling',  color:'var(--jade)'  },
  { id:'champion',   name:'Eco Champion',     desc:'Complete 50 eco actions',       icon:'medal',     color:'#FFB300'      },
  { id:'hero',       name:'Planet Hero',      desc:'Save 1000kg CO₂',              icon:'trophy',    color:'#FF7043'      },
  { id:'streak7',    name:'Week Warrior',     desc:'7-day streak',                  icon:'fire',      color:'#FF5252'      },
  { id:'streak30',   name:'Month Master',     desc:'30-day streak',                 icon:'star',      color:'#FFD700'      },
  { id:'water500',   name:'Water Guardian',   desc:'Save 500L of water',            icon:'tint',      color:'#29B6F6'      },
  { id:'trees10',    name:'Forester',         desc:'Log 10 tree-planting actions',  icon:'tree',      color:'#4CAF50'      },
  { id:'pts1000',    name:'Eco Master',       desc:'Earn 1000 points',              icon:'crown',     color:'#FFD700'      },
];

const WEEK_CHALLENGES = [
  { action:'bike',          description:'Bike instead of driving 5 times this week',   target:5  },
  { action:'vegetarian',    description:'Eat 7 vegetarian meals this week',             target:7  },
  { action:'recycle',       description:'Recycle items 10 times this week',             target:10 },
  { action:'reusable',      description:'Use reusable items 8 times this week',         target:8  },
  { action:'shortShower',   description:'Take 7 short showers this week',               target:7  },
  { action:'publicTransport',description:'Use public transport 5 times this week',     target:5  },
];

// Global state variables (will be set by modules)
let currentWeatherData = null;
let currentAQIData = null;
let currentLat = 13.41;
let currentLon = 122.56;
let currentLocationName = 'Philippines';
let currentState = null;
let tempChart = null, co2Chart = null;
let map = null, userMarker = null, cityMarkersLayer = null;
let standardLayer, satelliteLayer;
let aiPanelOpen = false;
