import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

replacements = {
    # H1 titles
    '<h1 class="text-2xl font-black text-slate-800">Dashboard Overview</h1>': '<h1 data-i18n="view.overview" class="text-2xl font-black text-slate-800">Dashboard Overview</h1>',
    '<h1 class="text-2xl font-black text-slate-800">Field Management Directory</h1>': '<h1 data-i18n="view.fields" class="text-2xl font-black text-slate-800">Field Management Directory</h1>',
    '<h1 class="text-2xl font-black text-slate-800">Crop Cycle Planner</h1>': '<h1 data-i18n="view.crops" class="text-2xl font-black text-slate-800">Crop Cycle Planner</h1>',
    '<h1 class="text-2xl font-black text-slate-800">History & Logs</h1>': '<h1 data-i18n="view.history" class="text-2xl font-black text-slate-800">History & Logs</h1>',
    '<h1 class="text-2xl font-black text-slate-800">Mandi Price Checker</h1>': '<h1 data-i18n="view.market" class="text-2xl font-black text-slate-800">Mandi Price Checker</h1>',
    '<h1 class="text-2xl font-black text-slate-800">IoT Sensor Networks</h1>': '<h1 data-i18n="view.sensors" class="text-2xl font-black text-slate-800">IoT Sensor Networks</h1>',
    '<h1 class="text-2xl font-black text-slate-800">Yield Analytics & Financial Reports</h1>': '<h1 data-i18n="view.reports" class="text-2xl font-black text-slate-800">Yield Analytics & Financial Reports</h1>',
    '<h1 class="text-2xl font-black text-slate-800">Farm Profile & System Settings</h1>': '<h1 data-i18n="view.settings" class="text-2xl font-black text-slate-800">Farm Profile & System Settings</h1>',
    
    # Table headers (Fields)
    '<th class="px-4 py-3">Field Name</th>': '<th data-i18n="th.fieldName" class="px-4 py-3">Field Name</th>',
    '<th class="px-4 py-3">Area (Acres)</th>': '<th data-i18n="th.area" class="px-4 py-3">Area (Acres)</th>',
    '<th class="px-4 py-3">Soil Type</th>': '<th data-i18n="th.soilType" class="px-4 py-3">Soil Type</th>',
    '<th class="px-4 py-3">Current Crop</th>': '<th data-i18n="th.currentCrop" class="px-4 py-3">Current Crop</th>',
    '<th class="px-4 py-3">Status</th>': '<th data-i18n="th.status" class="px-4 py-3">Status</th>',
    '<th class="px-4 py-3 text-right">Actions</th>': '<th data-i18n="th.actions" class="px-4 py-3 text-right">Actions</th>',
    
    # Table headers (Crops)
    '<th class="px-4 py-3">Crop Name</th>': '<th data-i18n="th.cropName" class="px-4 py-3">Crop Name</th>',
    '<th class="px-4 py-3">Variety</th>': '<th data-i18n="th.variety" class="px-4 py-3">Variety</th>',
    '<th class="px-4 py-3">Sowing Date</th>': '<th data-i18n="th.sowingDate" class="px-4 py-3">Sowing Date</th>',
    '<th class="px-4 py-3">Expected Harvest</th>': '<th data-i18n="th.expectedHarvest" class="px-4 py-3">Expected Harvest</th>',
    
    # Modals
    '<h3 class="font-black text-slate-800 text-base">Register New Field Block</h3>': '<h3 data-i18n="modal.newField" class="font-black text-slate-800 text-base">Register New Field Block</h3>',
    '<label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Field Name</label>': '<label data-i18n="label.fieldName" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Field Name</label>',
    '<label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Soil Type</label>': '<label data-i18n="label.soilType" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Soil Type</label>',
    '<label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Area (Acres)</label>': '<label data-i18n="label.area" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Area (Acres)</label>',
}

for k, v in replacements.items():
    html = html.replace(k, v)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('i18n attributes injected v2.')
