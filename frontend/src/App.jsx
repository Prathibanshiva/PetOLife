import { Navigate, Route, Routes } from 'react-router-dom'
import AddPet from './pages/AddPet'
import PetDetail from './pages/PetDetail'
import PetList from './pages/PetList'
export default function App() { return <Routes><Route path="/pets" element={<PetList />} /><Route path="/pets/new" element={<AddPet />} /><Route path="/pets/:petId" element={<PetDetail />} /><Route path="*" element={<Navigate to="/pets" replace />} /></Routes> }
