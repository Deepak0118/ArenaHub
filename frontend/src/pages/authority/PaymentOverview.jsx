import { useState, useEffect } from 'react';
import { Search, CheckCircle2, AlertCircle, IndianRupee } from 'lucide-react';
import { apiFetch } from '../../utils/api';

export default function PaymentOverview() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const data = await apiFetch('/payments');
      setPayments(data.payments);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (paymentId) => {
    setActionLoading(paymentId);
    setError('');
    try {
      await apiFetch(`/payments/${paymentId}/pay`, { method: 'POST' });
      setPayments(prev => prev.map(p => 
        p.id === paymentId ? { ...p, status: 'PAID' } : p
      ));
      setConfirmingId(null);
    } catch (err) {
      setError(`Failed to process payment: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredPayments = payments.filter(p => 
    (filter === 'ALL' || p.status === filter) &&
    (p.user.username.toLowerCase().includes(search.toLowerCase()) ||
    p.user.name.toLowerCase().includes(search.toLowerCase()) ||
    p.id.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-border border-t-foreground rounded-full animate-spin"></div>
      </div>
    );
  }

  const totalPending = payments.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl pt-6 md:pt-12 pb-4 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4 pb-6 border-b border-border">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-foreground"></div>
                <span className="text-[10px] text-foreground font-bold ">Billing & Transactions</span>
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                <h1 className="text-4xl font-display text-foreground">Payment Overview</h1>
                
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 bg-background border border-warning/30 rounded flex items-center gap-3">
                    <span className="text-[10px] font-bold text-warning">Pending Dues</span>
                    <span className="text-sm font-mono font-bold text-warning tabular-nums">Rs {totalPending}</span>
                  </div>
                </div>
              </div>
            </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-background-card border border-border text-foreground rounded px-3 py-2 focus:outline-none focus:border-brand transition-colors text-sm font-medium h-10 w-full sm:w-auto"
          >
            <option value="ALL">All Payments</option>
            <option value="PENDING">Pending (Unpaid)</option>
            <option value="PAID">Cleared (Paid)</option>
          </select>
          <div className="relative w-full sm:w-auto">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
            <input 
              type="text" 
              placeholder="Search student or invoice..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-background-card border border-border text-foreground rounded px-4 py-2 pl-10 focus:outline-none focus:border-brand transition-colors w-full sm:w-64 text-sm font-medium h-10"
            />
          </div>
        </div>
          </header>
          
          <div className="grid grid-cols-12 gap-4 px-8 pb-4 text-[10px] font-bold text-foreground-secondary hidden md:grid">
            <div className="col-span-4">Student & Reference</div>
            <div className="col-span-4">Details</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-2 text-right">Status</div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-12 pt-4">
        {error && (
          <div className="bg-error/10 border border-error/20 rounded p-4 mb-8 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-error mt-0.5" />
            <p className="font-bold text-sm text-error">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {filteredPayments.length === 0 ? (
            <div className="bg-transparent border border-dashed border-border rounded p-12 text-center flex flex-col items-center justify-center">
              <p className="text-xs font-bold text-foreground-muted">No records found</p>
            </div>
          ) : (
            filteredPayments.map((payment) => {
              const isPaid = payment.status === 'PAID';

              return (
                <div key={payment.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-4 px-4 py-4 items-center border border-transparent rounded hover:border-border hover:shadow-lg transition-all duration-300 group animate-fade-in-up">
                  
                  {}
                  <div className="col-span-1 md:col-span-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded bg-background-elevated border border-border flex items-center justify-center font-display font-bold text-lg text-foreground-secondary group-hover:border-foreground/30 group-hover:text-foreground transition-colors">
                      {payment.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">{payment.user.name}</div>
                      <div className="text-xs text-foreground-secondary truncate flex items-center gap-2 mt-0.5">
                        <span>@{payment.user.username}</span>
                        <span className="w-1 h-1 rounded-full bg-border"></span>
                        <span className="font-mono text-foreground-muted text-[10px]">{payment.id.split('-')[0]}</span>
                      </div>
                    </div>
                  </div>

                  {}
                  <div className="col-span-1 md:col-span-4">
                    <div className="text-xs font-bold text-foreground-secondary mb-0.5">
                      {payment.fine?.reason || (payment.type === 'ACTIVITY_FEE' && payment.booking ? `${payment.booking.gameConfig.name.replace('\n', ' ')} Fee` : payment.type.replace('_', ' '))}
                    </div>
                    {(payment.fine?.booking || payment.booking) && (
                      <div className="inline-flex items-center px-2 py-0.5 bg-background-elevated border border-border rounded text-[10px] font-bold text-foreground-muted mt-1">
                        Ref: {(payment.fine?.booking || payment.booking).id.split('-')[0]}
                      </div>
                    )}
                  </div>

                  {}
                  <div className="col-span-1 md:col-span-2 flex items-center">
                    <div className="text-sm font-mono font-bold text-foreground">
                      Rs {Number(payment.amount).toFixed(2)}
                    </div>
                  </div>

                  {}
                  <div className="col-span-1 md:col-span-2 flex justify-end items-center gap-3">
                    {!isPaid ? (
                      <>
                        <span className="inline-flex items-center text-[10px] font-bold text-warning">
                          Unpaid
                        </span>
                        {confirmingId === payment.id ? (
                          <div className="flex items-center gap-2 animate-fade-in-up">
                            <button 
                              onClick={() => setConfirmingId(null)}
                              className="text-[10px] font-bold text-foreground-secondary hover:text-foreground transition-colors px-2"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => handleMarkPaid(payment.id)}
                              disabled={actionLoading === payment.id}
                              className="bg-brand text-background shadow-brand/20 hover:bg-brand-light font-bold text-[10px] px-4 py-1.5 rounded transition-all duration-300 disabled:opacity-50"
                            >
                              {actionLoading === payment.id ? 'Wait...' : 'Confirm'}
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setConfirmingId(payment.id)}
                            className="bg-transparent text-foreground border border-border hover:bg-white/5 font-bold text-[10px] px-4 py-1.5 rounded transition-all duration-300"
                          >
                            Mark Paid
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="inline-flex items-center text-[10px] font-bold text-success">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Paid
                      </span>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
