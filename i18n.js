const translations = {
  en: {
    // Sidebar
    "nav.overview": "Overview",
    "nav.fields": "Fields",
    "nav.crops": "Crops",
    "nav.market": "Market Prices",
    "nav.sensors": "Sensors Telemetry",
    "nav.reports": "Reports & Yields",
    "nav.settings": "Settings",
    
    // Header
    "header.title": "Crop & Field Management Dashboard",
    "header.logout": "Sign Out",
    
    // Overview tab
    "stat.area": "Total Fields Area",
    "stat.crops": "Active Crops",
    "stat.yields": "Recent Yields",
    "stat.alerts": "Active Alerts",
    "title.upcoming": "Upcoming Activities",
    "title.alerts": "Recent Alerts",
    "btn.addField": "+ Register New Field",
    "btn.addCrop": "+ Assign New Crop",
    
    // Misc
    "lbl.loading": "Loading...",
    "lbl.noData": "No data available."
  },
  hi: {
    // Sidebar
    "nav.overview": "अवलोकन",
    "nav.fields": "खेत (Fields)",
    "nav.crops": "फसलें (Crops)",
    "nav.market": "मंडी भाव",
    "nav.sensors": "सेंसर डेटा",
    "nav.reports": "रिपोर्ट और पैदावार",
    "nav.settings": "सेटिंग्स",
    
    // Header
    "header.title": "फसल और खेत प्रबंधन डैशबोर्ड",
    "header.logout": "लॉग आउट",
    
    // Overview tab
    "stat.area": "कुल खेत क्षेत्र",
    "stat.crops": "सक्रिय फसलें",
    "stat.yields": "हाल की पैदावार",
    "stat.alerts": "सक्रिय अलर्ट",
    "title.upcoming": "आगामी गतिविधियां",
    "title.alerts": "हाल के अलर्ट",
    "btn.addField": "+ नया खेत जोड़ें",
    "btn.addCrop": "+ नई फसल जोड़ें",
    
    // Misc
    "lbl.loading": "लोड हो रहा है...",
    "lbl.noData": "कोई डेटा उपलब्ध नहीं है।"
  },
  mr: {
    // Sidebar
    "nav.overview": "विहंगावलोकन",
    "nav.fields": "शेत (Fields)",
    "nav.crops": "पिके (Crops)",
    "nav.market": "बाजार भाव",
    "nav.sensors": "सेन्सर डेटा",
    "nav.reports": "अहवाल आणि उत्पन्न",
    "nav.settings": "सेटिंग्ज",
    
    // Header
    "header.title": "पीक आणि शेत व्यवस्थापन डॅशबोर्ड",
    "header.logout": "लॉग आउट",
    
    // Overview tab
    "stat.area": "एकूण शेत क्षेत्र",
    "stat.crops": "सक्रिय पिके",
    "stat.yields": "अलीकडील उत्पन्न",
    "stat.alerts": "सक्रिय अलर्ट",
    "title.upcoming": "आगामी उपक्रम",
    "title.alerts": "अलीकडील अलर्ट",
    "btn.addField": "+ नवीन शेत जोडा",
    "btn.addCrop": "+ नवीन पीक जोडा",
    
    // Misc
    "lbl.loading": "लोड होत आहे...",
    "lbl.noData": "कोणताही डेटा उपलब्ध नाही."
  }
};

let currentLang = localStorage.getItem('app_lang') || 'en';

window.setLanguage = function(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  localStorage.setItem('app_lang', lang);
  
  // Translate static DOM elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang][key]) {
      if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
        el.setAttribute('placeholder', translations[lang][key]);
      } else {
        el.textContent = translations[lang][key];
      }
    }
  });

  // Re-render dynamic app components if app is loaded
  if (window.app && typeof window.app.renderOverviewStats === 'function') {
    window.app.renderOverviewStats();
  }
}

window.t = function(key) {
  return translations[currentLang][key] || translations['en'][key] || key;
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const selector = document.getElementById('lang-selector');
  if (selector) selector.value = currentLang;
  window.setLanguage(currentLang);
});
