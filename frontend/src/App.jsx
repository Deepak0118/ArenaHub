import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import { GlobalPageTransition } from './components/SportsLoader'

// Student Pages
import StudentLayout from './components/StudentLayout'
import GameBrowser from './pages/GameBrowser'
import RulesPreviewModal from './components/RulesPreviewModal'
import ActiveBooking from './pages/ActiveBooking'
import MyBookings from './pages/MyBookings'
import MyPayments from './pages/MyPayments'
import EventsBoard from './pages/EventsBoard'
import Profile from './pages/Profile'

// Auth Pages
import Login from './pages/Login'
import CompleteRegistration from './pages/CompleteRegistration'

// Public Pages
import LandingPage from './pages/LandingPage'

// Authority Pages
import AuthorityLayout from './components/AuthorityLayout'
import ControlRoom from './pages/authority/ControlRoom'
import AwaitingCollection from './pages/authority/AwaitingCollection'
import GameConfigEditor from './pages/authority/GameConfigEditor'
import PaymentOverview from './pages/authority/PaymentOverview'
import EventManager from './pages/authority/EventManager'

// Note: In production, the client ID should be loaded from import.meta.env
// We'll use a placeholder variable here to make it obvious where it goes.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'PUT_YOUR_CLIENT_ID_HERE';

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          <GlobalPageTransition>
            <Routes>
            
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<CompleteRegistration />} />
            
            <Route path="/" element={<LandingPage />} />

            <Route element={<ProtectedRoute><StudentLayout /></ProtectedRoute>}>
              <Route path="/games" element={<GameBrowser />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/payments" element={<MyPayments />} />
              <Route path="/events" element={<EventsBoard />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
            
            <Route path="/book/:id" element={
              <ProtectedRoute>
                <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
                  <RulesPreviewModal />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/active-booking/:id" element={
              <ProtectedRoute>
                <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
                  <ActiveBooking />
                </div>
              </ProtectedRoute>
            } />
            
            <Route path="/authority" element={<ProtectedRoute requireAuthority={true}><AuthorityLayout /></ProtectedRoute>}>
              <Route index element={<ControlRoom />} />
              <Route path="queue" element={<AwaitingCollection />} />
              <Route path="config" element={<GameConfigEditor />} />
              <Route path="payments" element={<PaymentOverview />} />
              <Route path="events" element={<EventManager />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </GlobalPageTransition>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}

export default App
