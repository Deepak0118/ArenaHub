import { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, Plus, Trash2, Hash, ChevronDown } from 'lucide-react';
import { apiFetch } from '../../utils/api';

export default function GameConfigEditor() {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  // New Resource State
  const [newResourceLabel, setNewResourceLabel] = useState('');
  const [addingResource, setAddingResource] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState('');

  const [formData, setFormData] = useState({
    isActive: true,
    slotDurationMinutes: 0,
    cooldownMinutes: 0,
    gracePeriodMinutes: 0,
    fineStrategy: 'SPLIT',
    finePerMinute: 0,
  });

  const fetchGames = async () => {
    try {
      const data = await apiFetch('/games');
      setGames(data.games);
      if (selectedGame) {
        const updatedSelected = data.games.find(g => g.id === selectedGame.id);
        if (updatedSelected) selectGame(updatedSelected);
      } else if (data.games.length > 0) {
        selectGame(data.games[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectGame = (game) => {
    setSelectedGame(game);
    setFormData({
      isActive: game.isActive,
      slotDurationMinutes: game.slotDurationMinutes,
      cooldownMinutes: game.cooldownMinutes,
      gracePeriodMinutes: game.gracePeriodMinutes,
      fineStrategy: game.fineStrategy,
      finePerMinute: game.finePerMinute,
    });
    setSaveSuccess('');
    setError('');
    setNewResourceLabel('');
    setSelectedUnitId(game.resources?.[0]?.id || '');
  };

  const handleGameSelectChange = (e) => {
    const gameId = e.target.value;
    const game = games.find(g => g.id === gameId);
    if (game) {
      selectGame(game);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'fineStrategy' ? value : (value === '' ? '' : Number(value))
    }));
  };

  const handleSaveConfig = async () => {
    setSaveLoading(true);
    setError('');
    setSaveSuccess('');
    
    // Ensure numeric fields are numbers before sending
    const payload = { ...formData };
    const numericFields = ['slotDurationMinutes', 'cooldownMinutes', 'gracePeriodMinutes', 'finePerMinute'];
    numericFields.forEach(field => {
      payload[field] = Number(payload[field]) || 0;
    });

    try {
      await apiFetch(`/games/${selectedGame.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      setSaveSuccess('Configuration updated successfully!');
      setTimeout(() => setSaveSuccess(''), 3000);

      // Update local state without full refetch
      setGames(prev => prev.map(g => g.id === selectedGame.id ? { ...g, ...payload } : g));
      setSelectedGame(prev => ({ ...prev, ...payload }));
      setFormData(prev => ({ ...prev, ...payload }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAddResource = async (e) => {
    e.preventDefault();
    if (!newResourceLabel.trim()) return;
    setAddingResource(true);
    setError('');
    try {
      await apiFetch(`/games/${selectedGame.id}/resources`, {
        method: 'POST',
        body: JSON.stringify({ label: newResourceLabel.trim() })
      });
      setNewResourceLabel('');
      await fetchGames(); // Refetch to get the new resource
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingResource(false);
    }
  };

  const handleDeleteResource = async (resourceId) => {
    setError('');
    try {
      await apiFetch(`/games/${selectedGame.id}/resources/${resourceId}`, {
        method: 'DELETE'
      });
      await fetchGames();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-border border-t-foreground rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-4xl mx-auto text-foreground">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl mb-6 border-b border-border pb-4 pt-2 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-foreground"></div>
            <span className="text-[10px] text-foreground font-bold uppercase tracking-wider">System Configuration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display">Session Parameters</h1>
        </div>
      </header>
      {games.length === 0 ? (
        <div className="bg-background-elevated border border-border rounded p-12 text-center text-xs font-bold text-foreground-muted">
          No games configured in the system
        </div>
      ) : selectedGame && (
        <div className="space-y-8">

          {}
          <div className="bg-background border border-border rounded p-6 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
            <label className="text-[10px] font-bold text-foreground-muted mb-2 block flex items-center gap-2">
              Select Game to Configure
            </label>
            <div className="relative">
              <select
                value={selectedGame.id}
                onChange={handleGameSelectChange}
                className="w-full appearance-none bg-background border border-border text-foreground rounded px-4 py-3 focus:outline-none focus:border-brand transition-colors font-display text-lg cursor-pointer"
              >
                {games.map(game => (
                  <option key={game.id} value={game.id}>
                    {game.name.replace('\n', ' ')}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronDown className="w-5 h-5 text-foreground-muted" />
              </div>
            </div>
          </div>

          {}
          <div className="bg-background border border-border rounded p-8 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-border to-transparent opacity-50"></div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Settings className="w-4 h-4 text-foreground" /> Session Settings
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-foreground-muted">Accepting New Sessions?</span>
                <button
                  onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                  className={`text-[10px] font-bold px-4 py-2 rounded shadow-lg transition-all duration-300 ${formData.isActive
                      ? 'bg-success text-background shadow-[0_0_15px_rgba(0,255,0,0.2)] hover:bg-white hover:text-success'
                      : 'bg-transparent text-error border border-error/50 hover:bg-error hover:text-background shadow-[0_0_15px_rgba(255,0,0,0.1)]'
                    }`}
                >
                  {formData.isActive ? 'Active / Open' : 'Paused / Closed'}
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-foreground-muted mb-2 block">Slot Duration (mins)</label>
                  <input
                    type="number"
                    name="slotDurationMinutes"
                    value={formData.slotDurationMinutes}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full bg-background border border-border text-foreground rounded px-4 py-2.5 focus:outline-none focus:border-brand transition-colors tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-foreground-muted mb-2 block">Wait Before Rebook (mins)</label>
                  <input
                    type="number"
                    name="cooldownMinutes"
                    value={formData.cooldownMinutes}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full bg-background border border-border text-foreground rounded px-4 py-2.5 focus:outline-none focus:border-brand transition-colors tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-foreground-muted mb-2 block">Late Grace Period (mins)</label>
                  <input
                    type="number"
                    name="gracePeriodMinutes"
                    value={formData.gracePeriodMinutes}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full bg-background border border-border text-foreground rounded px-4 py-2.5 focus:outline-none focus:border-brand transition-colors tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-foreground-muted mb-2 block">Fine Strategy</label>
                  <select
                    name="fineStrategy"
                    value={formData.fineStrategy}
                    onChange={handleInputChange}
                    className="w-full bg-background border border-border text-foreground rounded px-4 py-2.5 focus:outline-none focus:border-brand transition-colors text-sm"
                  >
                    <option value="SPLIT">Split across all players</option>
                    <option value="INDIVIDUAL">Individual per player</option>
                    <option value="FLAT">Flat fee (Booker pays)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-foreground-muted mb-2 block">Fine Amount (Rs per min)</label>
                  <input
                    type="number"
                    name="finePerMinute"
                    value={formData.finePerMinute}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full bg-background border border-border text-foreground rounded px-4 py-2.5 focus:outline-none focus:border-brand transition-colors tabular-nums"
                  />
                </div>
              </div>
            </div>

          </div>

          {}
          <div className="bg-background border border-border rounded p-8 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-border to-transparent opacity-50"></div>
            <h2 className="text-sm font-bold text-foreground mb-6 pb-4 border-b border-border flex items-center gap-2 relative z-10">
              <Hash className="w-4 h-4 text-foreground" /> Total Capacity
            </h2>

            {}
            {selectedGame.resources?.length > 0 && (
              <div className="flex gap-6 text-[10px] font-bold pb-4 mb-4 border-b border-border">
                <span className="text-success flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-success"></div>
                  {selectedGame.resources.filter(r => r.status === 'AVAILABLE').length} Available
                </span>
                <span className="text-warning flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-warning"></div>
                  {selectedGame.resources.filter(r => ['ISSUED', 'FROZEN'].includes(r.status)).length} In Use
                </span>
                <span className="text-error flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-error"></div>
                  {selectedGame.resources.filter(r => r.status === 'MAINTENANCE').length} Maintenance
                </span>
              </div>
            )}

            <div className="flex items-center justify-between bg-transparent p-6 border border-border rounded hover:border-foreground/30 transition-colors group">
              <div>
                <div className="text-xs font-bold text-foreground-muted mb-1">Total Available Units</div>
                <div className="text-sm text-foreground-secondary">
                  The number of concurrent games that can be played.
                </div>
              </div>

              <div className="flex items-center gap-4 bg-transparent border border-border rounded p-1">
                <button
                  onClick={async () => {
                    const availableResource = selectedGame.resources?.find(r => r.status === 'AVAILABLE');
                    if (availableResource) {
                      await handleDeleteResource(availableResource.id);
                    }
                  }}
                  disabled={addingResource || !selectedGame.resources?.some(r => r.status === 'AVAILABLE')}
                  className="w-10 h-10 flex items-center justify-center text-foreground hover:text-error hover:bg-error/10 rounded transition-colors disabled:opacity-30"
                  title="Remove Unit"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <span className="w-12 text-center font-display text-2xl text-foreground">
                  {selectedGame.resources?.length || 0}
                </span>

                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    setAddingResource(true);
                    setError('');
                    try {
                      await apiFetch(`/games/${selectedGame.id}/resources`, {
                        method: 'POST',
                        body: JSON.stringify({ label: `${selectedGame.name} #${(selectedGame.resources?.length || 0) + 1}` })
                      });
                      await fetchGames();
                    } catch (err) {
                      setError(err.message);
                    } finally {
                      setAddingResource(false);
                    }
                  }}
                  disabled={addingResource}
                  className="w-10 h-10 flex items-center justify-center text-foreground hover:text-foreground hover:bg-white/5 rounded transition-colors disabled:opacity-30"
                  title="Add Unit"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {}
            {selectedGame.resources?.length > 0 && (
              <div className="mt-4">
                <div className="mt-6 p-5 bg-transparent border border-border rounded hover:border-foreground/30 transition-colors">
                  <h3 className="text-[10px] font-bold text-foreground mb-3">Manage Specific Unit</h3>

                  {selectedGame.resources?.length > 0 ? (
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="relative flex-1">
                        <select
                          value={selectedUnitId || selectedGame.resources[0].id}
                          onChange={(e) => setSelectedUnitId(e.target.value)}
                          className="w-full appearance-none bg-background border border-border text-foreground rounded px-4 py-2.5 focus:outline-none focus:border-brand transition-colors text-sm cursor-pointer"
                        >
                          {selectedGame.resources.map(r => (
                            <option key={r.id} value={r.id}>{r.label}</option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <ChevronDown className="w-4 h-4 text-foreground-muted" />
                        </div>
                      </div>

                      {}
                      {(() => {
                        const resource = selectedGame.resources.find(r => r.id === (selectedUnitId || selectedGame.resources[0].id));
                        if (!resource) return null;

                        const isMaintenance = resource.status === 'MAINTENANCE';
                        const isInUse = resource.status === 'ISSUED' || resource.status === 'FROZEN';

                        return (
                          <div className="flex shrink-0 items-center justify-between md:justify-end gap-3 min-w-[200px] bg-background px-4 py-2.5 rounded border border-border">
                            {isInUse ? (
                              <>
                                <span className="text-[10px] font-bold text-warning">Currently in Use</span>
                                <div className="w-9 h-5 rounded-full bg-border opacity-50"></div>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={async () => {
                                    setError('');
                                    try {
                                      await apiFetch(`/games/${selectedGame.id}/resources/${resource.id}/status`, {
                                        method: 'PATCH',
                                        body: JSON.stringify({ status: isMaintenance ? 'AVAILABLE' : 'MAINTENANCE' })
                                      });
                                      await fetchGames();
                                    } catch (err) {
                                      setError(err.message);
                                    }
                                  }}
                                  className={`text-[10px] font-bold px-3 py-1.5 rounded transition-colors ${isMaintenance
                                      ? 'bg-error text-background hover:bg-error/80'
                                      : 'bg-background-elevated text-foreground hover:bg-brand hover:text-background border border-border'
                                    }`}
                                >
                                  {isMaintenance ? 'Under Maintenance' : 'Available'}
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="text-[10px] font-bold text-foreground-muted">No units available to manage</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {}
          {/* Toast Messages */}
          {error && (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-background-elevated border border-border shadow-2xl rounded-full px-6 py-3 flex items-center gap-3 animate-slideToast">
              <div className="w-2 h-2 rounded-full bg-error shadow-[0_0_10px_rgba(255,51,51,0.5)]"></div>
              <p className="text-sm font-medium tracking-wide text-foreground">{error}</p>
            </div>
          )}

          {saveSuccess && (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-background-elevated border border-border shadow-2xl rounded-full px-6 py-3 flex items-center gap-3 animate-slideToast">
              <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_10px_rgba(0,250,154,0.5)]"></div>
              <p className="text-sm font-medium tracking-wide text-foreground">{saveSuccess}</p>
            </div>
          )}

          <div className="flex justify-end pt-4 pb-12">
            <button
              onClick={handleSaveConfig}
              disabled={saveLoading}
              className="bg-transparent text-foreground border border-border hover:bg-foreground hover:text-background font-bold text-xs px-8 py-3 rounded shadow-lg transition-all duration-300 disabled:opacity-50 flex items-center gap-2 group"
            >
              {saveLoading ? 'Saving...' : (
                <>
                  <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  Save Configuration
                </>
              )}
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
