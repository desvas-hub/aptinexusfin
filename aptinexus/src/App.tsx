import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './contexts/ToastContext'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import PublicLayout from './components/layout/PublicLayout'
import AppShell from './components/layout/AppShell'

const Landing = lazy(() => import('./pages/public/Landing'))
const AuthPage = lazy(() => import('./pages/auth/AuthPage'))
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'))
const SkillGraphPage = lazy(() => import('./pages/skillgraph/SkillGraphPage'))
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'))
const ResumeAnalysisPage = lazy(() => import('./pages/profile/ResumeAnalysisPage'))
const SkillExplorerPage = lazy(() => import('./pages/development/SkillExplorerPage'))
const SkillGapPage = lazy(() => import('./pages/development/SkillGapPage'))
const RoadmapPage = lazy(() => import('./pages/development/RoadmapPage'))
const ProjectsPage = lazy(() => import('./pages/development/ProjectsPage'))
const SkillProofPage = lazy(() => import('./pages/development/SkillProofPage'))
const AssessmentPage = lazy(() => import('./pages/development/AssessmentPage'))
const CareerComparisonPage = lazy(() => import('./pages/careers/CareerComparisonPage'))
const WhatIfPage = lazy(() => import('./pages/insights/WhatIfPage'))
const AnalyticsPage = lazy(() => import('./pages/insights/AnalyticsPage'))
const ResourcesPage = lazy(() => import('./pages/development/ResourcesPage'))
const ExploreCareersPage = lazy(() => import('./pages/careers/ExploreCareersPage'))
const CareerDetailPage = lazy(() => import('./pages/careers/CareerDetailPage'))
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'))
const NotificationsPage = lazy(() => import('./pages/settings/NotificationsPage'))
const AboutPage = lazy(() => import('./pages/public/AboutPage'))
const HowItWorksPage = lazy(() => import('./pages/public/HowItWorksPage'))
const FeaturesPage = lazy(() => import('./pages/public/FeaturesPage'))
const PublicCareersPage = lazy(() => import('./pages/public/PublicCareersPage'))
const CareerDiscovery = lazy(() => import('./pages/careers/CareerDiscovery'))

export default function App() {
  return (
    <ThemeProvider><ToastProvider><AuthProvider><BrowserRouter>
      <Suspense fallback={<div className="grid min-h-[40vh] place-items-center"><span className="spinner" role="status" aria-label="Loading" /></div>}>
        <Routes>
          <Route element={<PublicLayout />}><Route index element={<Landing />} /><Route path="about" element={<AboutPage />} /><Route path="how-it-works" element={<HowItWorksPage />} /><Route path="features" element={<FeaturesPage />} /><Route path="careers" element={<PublicCareersPage />} /></Route>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/app" element={<AppShell />}><Route index element={<Dashboard />} /><Route path="skillgraph" element={<SkillGraphPage />} /><Route path="profile" element={<ProfilePage />} /><Route path="resume" element={<ResumeAnalysisPage />} /><Route path="skills" element={<SkillExplorerPage />} /><Route path="gaps" element={<SkillGapPage />} /><Route path="roadmap" element={<RoadmapPage />} /><Route path="projects" element={<ProjectsPage />} /><Route path="skillproof" element={<SkillProofPage />} /><Route path="assessments" element={<AssessmentPage />} /><Route path="compare" element={<CareerComparisonPage />} /><Route path="whatif" element={<WhatIfPage />} /><Route path="analytics" element={<AnalyticsPage />} /><Route path="resources" element={<ResourcesPage />} /><Route path="explore" element={<ExploreCareersPage />} /><Route path="careers/:id" element={<CareerDetailPage />} /><Route path="settings" element={<SettingsPage />} /><Route path="notifications" element={<NotificationsPage />} /><Route path="careers" element={<CareerDiscovery />} /></Route>
          <Route path="*" element={<PublicLayout />}><Route path="*" element={<div className="p-20 text-center">Page not found.</div>} /></Route>
        </Routes>
      </Suspense>
    </BrowserRouter></AuthProvider></ToastProvider></ThemeProvider>
  )
}

