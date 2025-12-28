import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Settings, Plane, Home, Wallet, CheckSquare, Calendar, Map as MapIcon, Loader, Globe
} from 'lucide-react';

import { COLORS } from './data/uiConstants';
import {
  setActiveTab, setShowSettings, loadFullTrip, setApiKey, generateTrip, setLanguage, initializeTrip
} from './store/tripSlice';
import { set } from 'idb-keyval';
import JSZip from 'jszip';
import { Overview } from './components/Overview';
import { PreTripTasks } from './components/PreTripTasks';
import { PackingList } from './components/PackingList';
import { Itinerary } from './components/Itinerary';
import { Budget } from './components/Budget';
import { Map } from './components/Map';
import { LOCALES } from './i18n/locales';
import { Button } from './components/CommonUI';

function WanderPlanContent() {
  const dispatch = useDispatch();
  const { tripDetails, expenses, itinerary, preTripTasks, apiKey, customPrompt, packingList, phrasebook, exchangeRates, isInitialized } = useSelector(state => state.trip);
  const activeTab = useSelector(state => state.trip.activeTab);
  const showSettings = useSelector(state => state.trip.showSettings);
  const loading = useSelector(state => state.trip.loading);
  const language = useSelector(state => state.trip.language || 'en');
  const t = LOCALES[language];

  // Auto-save to localStorage on change (Initial load handled in tripSlice)

  // Auto-save to IndexedDB on change
  React.useEffect(() => {
    if (!isInitialized) return;
    const tripData = { tripDetails, preTripTasks, itinerary, expenses, packingList, phrasebook, exchangeRates, language };
    set('wanderplan_current_trip', tripData).catch(err => console.error('Auto-save failed', err));
  }, [tripDetails, preTripTasks, itinerary, expenses, packingList, phrasebook, exchangeRates, language, isInitialized]);

  React.useEffect(() => {
    dispatch(initializeTrip());
  }, [dispatch]);

  const handleSaveTrip = async () => {
    const tripData = {
      version: 5,
      timestamp: new Date().toISOString(),
      tripDetails,
      preTripTasks,
      itinerary,
      expenses,
      packingList,
      phrasebook,
      exchangeRates,
      language
    };

    try {
      const zip = new JSZip();
      zip.file("trip_data.json", JSON.stringify(tripData, null, 2));

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `wanderplan-${tripDetails.destination || 'trip'}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to zip trip", error);
      alert("Failed to create backup archive.");
    }
  };

  const handleLoadTrip = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      if (file.name.endsWith('.zip')) {
        const zip = new JSZip();
        const unzipped = await zip.loadAsync(file);
        const jsonFile = unzipped.file("trip_data.json");
        if (jsonFile) {
          const content = await jsonFile.async("string");
          dispatch(loadFullTrip(JSON.parse(content)));
          alert("Trip archive loaded successfully!");
        } else {
          alert("Invalid archive: trip_data.json not found.");
        }
      } else {
        // Fallback for legacy JSON support
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            dispatch(loadFullTrip(JSON.parse(event.target.result)));
            alert("Trip loaded successfully!");
          } catch (error) {
            alert("Failed to load trip file.");
          }
        };
        reader.readAsText(file);
      }
    } catch (error) {
      console.error("Failed to load archive", error);
      alert("Failed to load trip archive.");
    }
    e.target.value = '';
  };


  return (
    <div className={`h-screen flex flex-col ${COLORS.bg} text-slate-800 font-sans selection:bg-indigo-100 overflow-hidden`}>
      <header className="shrink-0 h-16 bg-white/80 backdrop-blur-md z-40 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="text-indigo-600" />
            <span className="font-bold text-xl bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">WanderPlan</span>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {['overview', 'tasks', 'packing', 'itinerary', 'budget', 'map'].map((tab) => (
              <button
                key={tab}
                onClick={() => dispatch(setActiveTab(tab))}
                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'
                  }`}
              >
                {t[tab]}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button onClick={() => dispatch(setLanguage('en'))} className={`px-2 py-1 text-xs font-bold rounded ${language === 'en' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>EN</button>
              <button onClick={() => dispatch(setLanguage('cs'))} className={`px-2 py-1 text-xs font-bold rounded ${language === 'cs' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>CS</button>
            </div>
            <button onClick={() => dispatch(setShowSettings(true))} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 overflow-auto flex flex-col">
        {activeTab === 'overview' && (
          <Overview
            onSave={handleSaveTrip}
            onLoad={handleLoadTrip}
          />
        )}
        {activeTab === 'budget' && <Budget />}
        {activeTab === 'tasks' && <PreTripTasks />}
        {activeTab === 'packing' && <PackingList />}
        {activeTab === 'itinerary' && <Itinerary />}
        {activeTab === 'map' && <Map />}
      </main>

      {loading && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center">
            <Loader className="animate-spin text-indigo-600 mb-4" size={48} />
            <p className="text-lg font-bold text-slate-700">{t.generating}</p>
            <p className="text-sm text-slate-500">This may take a few seconds.</p>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold mb-4">{t.settings}</h2>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => dispatch(setApiKey(e.target.value))}
              placeholder="Gemini API Key"
              className="w-full p-2 border rounded-lg mb-4 text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => dispatch(setShowSettings(false))}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WanderPlan() {
  return <WanderPlanContent />;
}