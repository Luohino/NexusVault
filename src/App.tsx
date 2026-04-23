/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { NewRepo } from './pages/NewRepo';
import { Profile } from './pages/Profile';
import { Repository } from './pages/Repository';
import { Search } from './pages/Search';
import { About } from './pages/About';
import { Docs } from './pages/Docs';
import { Community } from './pages/Community';
import { Contact } from './pages/Contact';

export default function App() {
  return (
      <Router>
        <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col">
          <Navbar />
          <main className="flex-1 flex flex-col">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/community" element={<Community />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login/*" element={<Login />} />
              <Route path="/signup/*" element={<Signup />} />
              <Route path="/new" element={<NewRepo />} />
              <Route path="/search" element={<Search />} />
              <Route path="/:username" element={<Profile />} />
              <Route path="/:username/:repoName/*" element={<Repository />} />
            </Routes>
          </main>
        </div>
      </Router>
  );
}
