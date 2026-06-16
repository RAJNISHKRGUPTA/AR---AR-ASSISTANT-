import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CloudSun, Search, Calculator, Sparkles, Send, Copy, ArrowRight, Loader2 } from "lucide-react";

interface ToolsPanelProps {
  onInsertContext: (text: string) => void;
  onClose: () => void;
}

export default function ToolsPanel({ onInsertContext, onClose }: ToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<"search" | "weather" | "calc">("search");
  
  // Search tool state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [savingSearch, setSavingSearch] = useState(false);

  // Weather tool state
  const [weatherCity, setWeatherCity] = useState("");
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  // Calculator tool state
  const [calcExpr, setCalcExpr] = useState("");
  const [calcResult, setCalcResult] = useState("");
  const [calcHistory, setCalcHistory] = useState<string[]>([]);

  // Wikipedia Search Execution
  const triggerSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSavingSearch(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSearch(false);
    }
  };

  // Weather Query Execution
  const triggerWeather = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weatherCity.trim()) return;
    setLoadingWeather(true);
    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(weatherCity)}`);
      const data = await res.json();
      setWeatherData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingWeather(false);
    }
  };

  // Calculator execution
  const triggerCalc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calcExpr.trim()) return;
    try {
      // Safe replacement of operators & evaluations
      const sanitized = calcExpr.replace(/[^0-9+\-*/().\s]/g, "");
      // eslint-disable-next-line no-eval
      const result = eval(sanitized);
      const output = `${calcExpr} = ${result}`;
      setCalcResult(String(result));
      setCalcHistory([output, ...calcHistory.slice(0, 4)]);
    } catch (err) {
      setCalcResult("Expression error");
    }
  };

  const getWeatherDescription = (code: number) => {
    if (code === 0) return "Clear sky ☀️";
    if (code >= 1 && code <= 3) return "Partly cloudy ⛅";
    if (code >= 45 && code <= 48) return "Foggy 🌫️";
    if (code >= 51 && code <= 55) return "Drizzle 🌧️";
    if (code >= 61 && code <= 65) return "Rainy 🌧️";
    if (code >= 71 && code <= 77) return "Snowy ❄️";
    if (code >= 80 && code <= 82) return "Showers ⛈️";
    return "Dynamic climatic fluctuation 🌦️";
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1 px-1.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">
            <Sparkles className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100">AR-AI Coprocessor Tools</h4>
            <span className="text-[10px] font-mono text-slate-400">Phase 9 Web & Weather Agents</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex divide-x divide-slate-800 border-b border-slate-800 bg-slate-950/40">
        <button
          onClick={() => setActiveTab("search")}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === "search" ? "bg-slate-900 text-indigo-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Search className="h-3.5 w-3.5" />
          Web Search
        </button>
        <button
          onClick={() => setActiveTab("weather")}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === "weather" ? "bg-slate-900 text-indigo-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <CloudSun className="h-3.5 w-3.5" />
          Live Weather
        </button>
        <button
          onClick={() => setActiveTab("calc")}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === "calc" ? "bg-slate-900 text-indigo-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Calculator className="h-3.5 w-3.5" />
          Calculator
        </button>
      </div>

      {/* Content Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence mode="wait">
          {activeTab === "search" && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-4"
            >
              <form onSubmit={triggerSearch} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Query Wikipedia Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={savingSearch}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-3 flex items-center justify-center text-white"
                >
                  {savingSearch ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                </button>
              </form>

              <div className="space-y-3">
                {searchResults.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-800 p-8 text-center">
                    <Search className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Query wiki search above. Results can be injected as custom context details in 1-click.</p>
                  </div>
                ) : (
                  searchResults.map((item, index) => (
                    <div
                      key={index}
                      className="group relative rounded-xl border border-slate-800 bg-slate-950/20 p-3 hover:border-slate-700/60 transition-colors space-y-1"
                    >
                      <h5 className="text-xs font-bold text-slate-200">{item.title}</h5>
                      <p className="text-[10.5px] leading-relaxed text-slate-400 line-clamp-3">
                        {item.snippet}
                      </p>
                      <div className="flex items-center justify-between pt-2.5">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[9px] font-mono text-indigo-400 hover:underline"
                        >
                          View source article
                        </a>
                        <button
                          onClick={() => {
                            onInsertContext(`[Web Search Result for "${searchQuery}"]: \nTitle: ${item.title}\nContent: ${item.snippet}`);
                          }}
                          className="text-[9.5px] font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded flex items-center gap-1 transition-all"
                        >
                          <Copy className="h-2.5 w-2.5" /> Contextualize
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "weather" && (
            <motion.div
              key="weather"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-4"
            >
              <form onSubmit={triggerWeather} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter City Name (e.g., Paris, Tokyo, Mumbai)..."
                  value={weatherCity}
                  onChange={(e) => setWeatherCity(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={loadingWeather}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-3 flex items-center justify-center text-white"
                >
                  {loadingWeather ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                </button>
              </form>

              {weatherData ? (
                weatherData.error ? (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 text-center">
                    {weatherData.error}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-sm font-semibold text-slate-100">{weatherData.location}</h5>
                        <span className="text-[10px] font-mono text-slate-400">
                          Lat: {weatherData.latitude.toFixed(2)} / Lng: {weatherData.longitude.toFixed(2)}
                        </span>
                      </div>
                      <CloudSun className="h-8 w-8 text-indigo-400 shrink-0" />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-lg bg-slate-950/40 p-2 border border-slate-800/40 text-center">
                        <span className="text-[9px] text-slate-500 block uppercase font-mono">Temperature</span>
                        <span className="text-sm font-bold text-slate-100">{weatherData.temperature}°C</span>
                      </div>
                      <div className="rounded-lg bg-slate-950/40 p-2 border border-slate-800/40 text-center">
                        <span className="text-[9px] text-slate-500 block uppercase font-mono">Feels Like</span>
                        <span className="text-sm font-bold text-slate-100">{weatherData.apparentTemperature}°C</span>
                      </div>
                      <div className="rounded-lg bg-slate-950/40 p-2 border border-slate-800/40 text-center">
                        <span className="text-[9px] text-slate-500 block uppercase font-mono">Relative Humidity</span>
                        <span className="text-sm font-bold text-slate-100">{weatherData.humidity}%</span>
                      </div>
                      <div className="rounded-lg bg-slate-950/40 p-2 border border-slate-800/40 text-center">
                        <span className="text-[9px] text-slate-500 block uppercase font-mono">Wind Velocities</span>
                        <span className="text-sm font-bold text-slate-100">{weatherData.windSpeed} km/h</span>
                      </div>
                    </div>

                    <div className="rounded-lg bg-indigo-950/20 border border-indigo-900/30 p-2 text-center text-xs font-medium text-indigo-400">
                      Condition forecast: {getWeatherDescription(weatherData.weatherCode)}
                    </div>

                    <button
                      onClick={() => {
                        onInsertContext(
                          `[Live Metar Climate for ${weatherData.location}]: \nForecast: ${getWeatherDescription(
                            weatherData.weatherCode
                          )}\nTemperature: ${weatherData.temperature}°C | RealFeel: ${
                            weatherData.apparentTemperature
                          }°C\nHumidity: ${weatherData.humidity}% | Wind speed: ${weatherData.windSpeed} km/h`
                        );
                      }}
                      className="w-full rounded-lg bg-slate-800 hover:bg-slate-700 py-1.5 text-xs text-slate-200 hover:text-white font-medium flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Copy className="h-3 w-3" /> Contextualize Weather metrics
                    </button>
                  </div>
                )
              ) : (
                <div className="rounded-lg border border-dashed border-slate-800 p-8 text-center text-xs text-slate-500">
                  Provide localized city targets above to pull active climate coordinates.
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "calc" && (
            <motion.div
              key="calc"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-4"
            >
              <form onSubmit={triggerCalc} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Construct expression (e.g. 52 * 12 / 1.5)..."
                  value={calcExpr}
                  onChange={(e) => setCalcExpr(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 flex items-center justify-center text-white text-xs font-semibold"
                >
                  Calc
                </button>
              </form>

              {calcResult && (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-center">
                  <span className="text-[9px] text-slate-500 uppercase font-mono block">Evaluated Sum Result</span>
                  <p className="text-xl font-bold text-indigo-400 font-mono tracking-wide">{calcResult}</p>
                  
                  <button
                    onClick={() => {
                      onInsertContext(`[Coprocessor Evaluation]: \nEquation: ${calcExpr}\nCalculated Sum = ${calcResult}`);
                    }}
                    className="mt-3 mx-auto rounded-lg bg-slate-800 hover:bg-slate-700 py-1 px-3 text-[10px] text-slate-300 font-medium flex items-center gap-1 transition-colors"
                  >
                    <Copy className="h-2.5 w-2.5" /> Inject into message
                  </button>
                </div>
              )}

              {/* Quick Math Buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                {["+", "-", "*", "/", "7", "8", "9", "(", "4", "5", "6", ")", "1", "2", "3", "0"].map((btn) => (
                  <button
                    key={btn}
                    onClick={() => setCalcExpr((prev) => prev + btn)}
                    className="rounded bg-slate-800/40 p-1.5 font-mono text-xs hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  >
                    {btn}
                  </button>
                ))}
              </div>

              {calcHistory.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[9px] text-slate-500 font-mono uppercase block">History logs</span>
                  <div className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-2 divide-y divide-slate-900 font-mono text-[10px] text-slate-400">
                    {calcHistory.map((hist, idx) => (
                      <div key={idx} className="py-1 flex justify-between items-center">
                        <span>{hist}</span>
                        <ArrowRight className="h-2.5 w-2.5 text-slate-600" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
