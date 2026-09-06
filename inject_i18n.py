import re
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('<script src="mockData.js"></script>', '<script src="i18n.js?v=1"></script>\n  <script src="mockData.js"></script>')

replacements = {
    '<span>Overview</span>': '<span data-i18n="nav.overview">Overview</span>',
    '<span>Fields</span>': '<span data-i18n="nav.fields">Fields</span>',
    '<span>Crops</span>': '<span data-i18n="nav.crops">Crops</span>',
    '<span>Reports & Yields</span>': '<span data-i18n="nav.reports">Reports & Yields</span>',
    '<span>History & Logs</span>': '<span data-i18n="nav.history">History & Logs</span>',
    '<span>Market Prices</span>': '<span data-i18n="nav.market">Market Prices</span>',
    '<span>Sensors Telemetry</span>': '<span data-i18n="nav.sensors">Sensors Telemetry</span>',
    '<span>Settings</span>': '<span data-i18n="nav.settings">Settings</span>',
    '<span>Log Out</span>': '<span data-i18n="nav.logout">Log Out</span>',
    '<span>Reports</span>': '<span data-i18n="nav.reports">Reports</span>',
    '<p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Fields Area</p>': '<p data-i18n="stat.area" class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Fields Area</p>',
    '<p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Active Crops</p>': '<p data-i18n="stat.crops" class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Active Crops</p>',
    '<p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Recent Yields</p>': '<p data-i18n="stat.yields" class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Recent Yields</p>',
    '<p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Active Alerts</p>': '<p data-i18n="stat.alerts" class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Active Alerts</p>',
    '<h3 class="font-black text-slate-800 text-sm">Upcoming Activities</h3>': '<h3 data-i18n="title.upcoming" class="font-black text-slate-800 text-sm">Upcoming Activities</h3>',
    '<h3 class="font-black text-slate-800 text-sm">Recent Alerts</h3>': '<h3 data-i18n="title.alerts" class="font-black text-slate-800 text-sm">Recent Alerts</h3>',
    '+ Register New Field': '<span data-i18n="btn.addField">+ Register New Field</span>',
    '+ Assign New Crop': '<span data-i18n="btn.addCrop">+ Assign New Crop</span>'
}

for k, v in replacements.items():
    html = html.replace(k, v)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('Done!')
