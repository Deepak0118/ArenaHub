import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, AlertCircle, Receipt, Clock, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function MyPayments() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const fetchPayments = async () => {
    try {
      const data = await apiFetch('/payments/my');
      setPayments(data.payments);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handlePay = async (id) => {
    setProcessingId(id);
    setError('');
    try {
      const data = await apiFetch(`/payments/${id}/razorpay-order`, { method: 'POST' });
      
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "ArenaHub",
        description: "ArenaHub Fee Payment",
        order_id: data.orderId,
        handler: async function (response) {
          try {
            await apiFetch(`/payments/${id}/verify`, {
              method: 'POST',
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            await fetchPayments();
          } catch (verifyErr) {
            setError(verifyErr.message || "Payment verification failed");
          } finally {
            setProcessingId(null);
          }
        },
        prefill: {
          name: data.user.name,
          email: data.user.email,
          contact: data.user.contact
        },
        theme: {
          color: "#CCFF00"
        },
        modal: {
          ondismiss: function() {
            setProcessingId(null);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response){
        setError(response.error.description || "Payment failed");
        setProcessingId(null);
      });
      rzp.open();

    } catch (err) {
      setError(err.message || "Could not initialize payment");
      setProcessingId(null);
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'PAID': return { label: 'Paid', bg: 'bg-success/5', border: 'border-success/30', text: 'text-success' };
      case 'PENDING': return { label: 'Pending', bg: 'bg-warning/5', border: 'border-warning/30', text: 'text-warning' };
      case 'FAILED': return { label: 'Failed', bg: 'bg-error/5', border: 'border-error/30', text: 'text-error' };
      case 'REFUNDED': return { label: 'Refunded', bg: 'bg-background-elevated', border: 'border-border', text: 'text-foreground-secondary' };
      default: return { label: status, bg: 'bg-background-elevated', border: 'border-border', text: 'text-foreground-secondary' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-border border-t-foreground rounded-full animate-spin"></div>
      </div>
    );
  }

  const pendingAmount = payments
    .filter(p => p.status === 'PENDING')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl pt-8 pb-4 shadow-sm">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          
          <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6 border-b border-border">
            <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-foreground"></div>
              <span className="text-[10px] text-foreground font-bold ">Billing & Transactions</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl text-foreground mb-2">
              My Payments
            </h1>
            <p className="text-foreground-secondary font-medium text-xs ">
              View payments and pending fines
            </p>
          </div>
          <div className="text-left md:text-right">
            <span className="text-xs text-foreground-secondary font-bold block mb-1">
              Pending Dues
            </span>
            <span className={`font-display text-3xl font-bold tabular-nums ${pendingAmount > 0 ? 'text-error' : 'text-success'}`}>
              Rs {pendingAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {payments.length > 0 && (
          <div className="hidden md:grid grid-cols-12 gap-6 px-5 py-3 border-b border-border text-[10px] font-bold text-foreground-secondary">
            <div className="col-span-3">Invoice & Date</div>
            <div className="col-span-5">Details</div>
            <div className="col-span-4 text-right">Amount & Status</div>
          </div>
        )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8 pt-4 pb-8">

        {error && (
          <div className="mb-8 p-4 bg-error/10 border border-error/20 rounded flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
            <p className="text-sm text-error font-medium">{error}</p>
          </div>
        )}

        {pendingAmount > 0 && (
          <div className="mb-8 p-4 bg-warning/5 border border-warning/20 rounded flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <p className="text-sm text-warning font-medium">You have Rs {pendingAmount.toFixed(2)} in pending fines. Please settle them as soon as possible to avoid account restrictions.</p>
          </div>
        )}

        <div className="space-y-4">          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-4 border border-dashed border-border rounded-lg bg-transparent text-center">
              <CheckCircle2 className="w-10 h-10 text-foreground-muted mb-3" />
              <p className="text-foreground-secondary font-bold text-xs ">No payment history found</p>
            </div>
          ) : (
            payments.map((payment) => {
              const conf = getStatusConfig(payment.status);
              const isProcessing = processingId === payment.id;
              
              return (
                <div 
                  key={payment.id} 
                  className="group bg-transparent border border-transparent rounded hover:border-border hover:shadow-lg transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between p-5 gap-6"
                >
                  <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    
                    {}
                    <div className="md:col-span-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Receipt className="w-4 h-4 text-foreground-muted group-hover:scale-125 group-hover:rotate-12 group-hover:text-foreground transition-all duration-300" />
                        <span className="font-mono text-sm text-foreground ">
                          INV-{payment.id.split('-')[0]}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] text-foreground-secondary font-bold tabular-nums flex items-center">
                          <span className="text-foreground-muted w-20">Issued on:</span>
                          {new Date(payment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        {payment.status === 'PAID' && payment.paidAt && (
                          <div className="text-[10px] text-success/80 font-bold tabular-nums flex items-center">
                            <span className="text-success/50 w-20">Paid on:</span>
                            {new Date(payment.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        )}
                      </div>
                    </div>

                    {}
                    <div className="md:col-span-5">
                      <div className="text-sm font-bold text-foreground mb-1">
                        {payment.fine?.reason || (payment.type === 'ACTIVITY_FEE' && payment.booking ? `${payment.booking.gameConfig.name.replace('\n', ' ')} Fee` : payment.type.replace('_', ' '))}
                      </div>
                      {(payment.fine?.booking || payment.booking) && (
                        <div className="text-[10px] text-foreground-secondary font-bold ">
                          Ref: {(payment.fine?.booking || payment.booking).gameConfig.name.replace('\n', ' ')}
                        </div>
                      )}
                    </div>

                    {}
                    <div className="md:col-span-4 flex items-center justify-between md:justify-end gap-6">
                      <div className="flex items-center gap-4">
                        <span className="font-display text-xl tabular-nums text-foreground">
                          Rs {parseFloat(payment.amount).toFixed(2)}
                        </span>
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold border ${conf.bg} ${conf.text} ${conf.border}`}>
                          {conf.label}
                        </span>
                      </div>
                      {payment.status !== 'PAID' && (
                        <button 
                          onClick={() => handlePay(payment.id)}
                          disabled={isProcessing}
                          className="px-6 py-2 text-xs font-bold bg-transparent border border-border text-foreground hover:bg-white/5 transition-all rounded disabled:opacity-50"
                        >
                          {isProcessing ? 'Wait...' : 'Pay'}
                        </button>
                      )}
                    </div>

                  </div>

                </div>
              )
            })
          )}
        </div>

      </div>
    </div>
  );
}
