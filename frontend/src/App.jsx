import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'

import Login from './pages/Login.jsx'
import PetList from './pages/PetList.jsx'
import PetDetail from './pages/PetDetail.jsx'
import AddPet from './pages/AddPet.jsx'
import FrontDesk from './pages/FrontDesk.jsx'
import ManageDoctors from './pages/ManageDoctors.jsx'
import DoctorHome from './pages/DoctorHome.jsx'
import ConsultationPage from './pages/ConsultationPage.jsx'

function RequireAuth({ children, allowedRoles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // redirect to their home
    if (user.role === 'receptionist') return <Navigate to="/front-desk" replace />
    if (user.role === 'doctor') return <Navigate to="/doctor" replace />
    return <Navigate to="/pets" replace />
  }
  return children
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? (
        user.role === 'receptionist' ? <Navigate to="/front-desk" replace /> :
        user.role === 'doctor' ? <Navigate to="/doctor" replace /> :
        <Navigate to="/pets" replace />
      ) : <Login />} />

      {/* Receptionist routes */}
      <Route path="/front-desk" element={
        <RequireAuth allowedRoles={['receptionist']}>
          <FrontDesk />
        </RequireAuth>
      } />
      <Route path="/doctors" element={
        <RequireAuth allowedRoles={['receptionist']}>
          <ManageDoctors />
        </RequireAuth>
      } />

      {/* Doctor routes */}
      <Route path="/doctor" element={
        <RequireAuth allowedRoles={['doctor']}>
          <DoctorHome />
        </RequireAuth>
      } />
      <Route path="/doctor/visit/:visitId" element={
        <RequireAuth allowedRoles={['doctor']}>
          <ConsultationPage />
        </RequireAuth>
      } />

      {/* Owner (and clinic staff can view) routes */}
      <Route path="/pets" element={
        <RequireAuth allowedRoles={['owner', 'receptionist', 'doctor']}>
          <PetList />
        </RequireAuth>
      } />
      <Route path="/pets/new" element={
        <RequireAuth allowedRoles={['owner', 'receptionist']}>
          <AddPet />
        </RequireAuth>
      } />
      <Route path="/pets/:petId" element={
        <RequireAuth allowedRoles={['owner', 'receptionist', 'doctor']}>
          <PetDetail />
        </RequireAuth>
      } />

      {/* Default redirect */}
      <Route path="/" element={
        user ? (
          user.role === 'receptionist' ? <Navigate to="/front-desk" replace /> :
          user.role === 'doctor' ? <Navigate to="/doctor" replace /> :
          <Navigate to="/pets" replace />
        ) : <Navigate to="/login" replace />
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
