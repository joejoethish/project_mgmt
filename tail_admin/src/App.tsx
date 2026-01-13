import { BrowserRouter as Router, Routes, Route } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import ForgotPassword from "./pages/AuthPages/ForgotPassword";
import ResetPassword from "./pages/AuthPages/ResetPassword";
import AcceptInvite from './pages/AuthPages/AcceptInvite';
import NotFound from "./pages/OtherPage/NotFound";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import DataGridPage from "./pages/Tables/DataGridPage";
import AdvancedTablePage from "./pages/Tables/AdvancedTablePage";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import DailyStatus from "./pages/DailyStatus";
import PeerReview from "./pages/PeerReview";
import TeamUpdate from "./pages/TeamUpdate";
import WeeklyReport from "./pages/WeeklyReport";
import MastersDashboard from "./pages/masters/Dashboard";
import DynamicMaster from "./pages/masters/DynamicMaster";
import CreateMaster from "./pages/masters/CreateMaster";
import MasterBuilderWizard from "./pages/masters/MasterBuilderWizard";
import VisualMasterBuilder from "./pages/masters/VisualMasterBuilder";
import DepartmentList from "./pages/hr/DepartmentList";
import DepartmentForm from "./pages/hr/DepartmentForm";
import DesignationList from "./pages/hr/DesignationList";
import DesignationForm from "./pages/hr/DesignationForm";
import EmployeeList from "./pages/hr/EmployeeList";
import EmployeeForm from "./pages/hr/EmployeeForm";
import LeaveTypeList from "./pages/hr/LeaveTypeList";
import LeaveTypeForm from "./pages/hr/LeaveTypeForm";
import ProjectList from "./pages/pm/ProjectList";
import ProjectForm from "./pages/pm/ProjectForm";
import ProjectLayout from "./pages/pm/ProjectLayout";
import ProjectDashboard from "./pages/pm/ProjectDashboard";
import KanbanBoard from "./pages/pm/KanbanBoard";
import TaskList from "./pages/pm/TaskList";
import ProjectFiles from "./pages/pm/ProjectFiles";
import ProjectMembers from "./pages/pm/ProjectMembers";
import TeamsList from "./pages/pm/TeamsList";
import SprintsList from "./pages/pm/SprintsList";
import RolesList from "./pages/pm/RolesList";
import WorkflowsList from "./pages/pm/WorkflowsList";
import TeamForm from "./pages/pm/TeamForm";
import SprintForm from "./pages/pm/SprintForm";
import RoleForm from "./pages/pm/RoleForm";
import WorkflowForm from "./pages/pm/WorkflowForm";
import WorkflowBoard from "./pages/pm/WorkflowBoard";
import TimesheetPage from "./pages/pm/TimesheetPage";
import TeamTimesheetsPage from "./pages/pm/TeamTimesheetsPage";
import TaskForm from "./pages/pm/TaskForm";
import AllTasksList from "./pages/pm/AllTasksList";
import IterationsList from "./pages/pm/IterationsList";
import IterationForm from "./pages/pm/IterationForm";
import IterationBoard from "./pages/pm/IterationBoard";
import TagsList from "./pages/tags/TagsList";
import TagForm from "./pages/tags/TagForm";
import ReportBuilder from "./pages/reporting/ReportBuilder";
import ReportViewer from "./pages/reporting/ReportViewer";
import DatasetBuilder from "./pages/reporting/DatasetBuilder";
import DatasetERDPage from "./pages/reporting/DatasetERDPage";
import ProfilePage from "./pages/gamification/ProfilePage";
import LeaderboardPage from "./pages/gamification/LeaderboardPage";
import ChallengesPage from "./pages/gamification/ChallengesPage";
import RewardsPage from "./pages/gamification/RewardsPage";
import CreditRulesPage from "./pages/gamification/CreditRulesPage";
import SettingsPage from "./pages/SettingsPage";
import PermissionMatrix from "./pages/Settings/PermissionMatrix";
import EditProfilePage from "./pages/EditProfilePage";
import ZohoIntegrationPage from "./pages/ZohoIntegrationPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import GitHubDashboard from "./pages/github/GitHubDashboard";
import PullRequestList from "./pages/github/PullRequestList";
import RepositoryList from "./pages/github/RepositoryList";
import PeerReviewForm from "./pages/github/PeerReviewForm";
import OrganizationList from "./pages/github/OrganizationList";
import CommitList from "./pages/github/CommitList";

import { Toaster } from "react-hot-toast";

export default function App() {
  return (
    <>
      <Toaster position="top-right" containerStyle={{ zIndex: 9999999 }} />
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Auth Layout */}
          <Route path="/auth/signin" element={<SignIn />} />
          <Route path="/auth/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
          <Route path="/accept-invite/:token" element={<AcceptInvite />} />

          {/* Dashboard Layout */}
          <Route element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Home />} />

            {/* Others Page */}
            <Route path="/impact" element={<ProfilePage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/challenges" element={<ChallengesPage />} />
            <Route path="/rewards" element={<RewardsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/permissions" element={<PermissionMatrix />} />
            <Route path="/edit-profile" element={<EditProfilePage />} />
            <Route path="/credit-rules" element={<CreditRulesPage />} />
            <Route path="/zoho-integration" element={<ZohoIntegrationPage />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/blank" element={<Blank />} />

            {/* Forms */}
            <Route path="/form-elements" element={<FormElements />} />

            {/* Work Forms */}
            <Route path="/forms/daily-status" element={<DailyStatus />} />
            <Route path="/forms/peer-review" element={<PeerReview />} />
            <Route path="/forms/team-update" element={<TeamUpdate />} />
            <Route path="/forms/weekly-report" element={<WeeklyReport />} />

            {/* Tables */}
            <Route path="/basic-tables" element={<BasicTables />} />
            <Route path="/tables/data-grid" element={<DataGridPage />} />
            <Route path="/tables/advanced" element={<AdvancedTablePage />} />

            {/* Ui Elements */}
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/avatars" element={<Avatars />} />
            <Route path="/badge" element={<Badges />} />
            <Route path="/buttons" element={<Buttons />} />
            <Route path="/images" element={<Images />} />
            <Route path="/videos" element={<Videos />} />

            {/* Charts */}
            <Route path="/line-chart" element={<LineChart />} />
            <Route path="/bar-chart" element={<BarChart />} />

            {/* Masters Management */}
            <Route path="/masters" element={<MastersDashboard />} />
            <Route path="/masters/create" element={<CreateMaster />} />
            <Route path="/masters/wizard" element={<MasterBuilderWizard />} />
            <Route path="/masters/visual" element={<VisualMasterBuilder />} />
            <Route path="/masters/data/:masterName" element={<DynamicMaster />} />
            <Route path="/masters/:masterName" element={<DynamicMaster />} />

            {/* HR Module */}
            <Route path="/hr/departments" element={<DepartmentList />} />
            <Route path="/hr/departments/new" element={<DepartmentForm />} />
            <Route path="/hr/departments/:id" element={<DepartmentForm />} />
            <Route path="/hr/designations" element={<DesignationList />} />
            <Route path="/hr/designations/new" element={<DesignationForm />} />
            <Route path="/hr/designations/:id" element={<DesignationForm />} />
            <Route path="/hr/employees" element={<EmployeeList />} />
            <Route path="/hr/employees/new" element={<EmployeeForm />} />
            <Route path="/hr/employees/:id" element={<EmployeeForm />} />
            <Route path="/hr/leave-types" element={<LeaveTypeList />} />
            <Route path="/hr/leave-types/new" element={<LeaveTypeForm />} />
            <Route path="/hr/leave-types/:id" element={<LeaveTypeForm />} />

            {/* PM Module */}
            <Route path="/pm/projects" element={<ProjectList />} />
            <Route path="/pm/tasks" element={<AllTasksList />} />
            <Route path="/pm/projects/new" element={<ProjectForm />} />
            <Route path="/pm/teams" element={<TeamsList />} />
            <Route path="/pm/teams/new" element={<TeamForm />} />
            <Route path="/pm/teams/:id" element={<TeamForm />} />

            <Route path="/pm/sprints" element={<SprintsList />} />
            <Route path="/pm/sprints/new" element={<SprintForm />} />
            <Route path="/pm/sprints/:id" element={<SprintForm />} />

            <Route path="/pm/roles" element={<RolesList />} />
            <Route path="/pm/roles/new" element={<RoleForm />} />
            <Route path="/pm/roles/:id" element={<RoleForm />} />

            <Route path="/pm/workflows" element={<WorkflowsList />} />
            <Route path="/pm/workflows/board" element={<WorkflowBoard />} />
            <Route path="/pm/timesheets" element={<TimesheetPage />} />
            <Route path="/pm/team-timesheets" element={<TeamTimesheetsPage />} />
            <Route path="/pm/workflows/new" element={<WorkflowForm />} />
            <Route path="/pm/workflows/:id" element={<WorkflowForm />} />

            {/* Iterations - Cross-Project Planning */}
            <Route path="/pm/iterations" element={<IterationsList />} />
            <Route path="/pm/iterations/new" element={<IterationForm />} />
            <Route path="/pm/iterations/:id" element={<IterationBoard />} />
            <Route path="/pm/iterations/:id/edit" element={<IterationForm />} />

            {/* Tags Module */}
            <Route path="/tags" element={<TagsList />} />
            <Route path="/tags/new" element={<TagForm />} />
            <Route path="/tags/:id" element={<TagForm />} />

            {/* Reporting Module */}
            <Route path="/reporting/builder" element={<ReportBuilder />} />
            <Route path="/reporting/saved" element={<ReportBuilder />} />
            <Route path="/reporting/datasets" element={<DatasetBuilder />} />
            <Route path="/reporting/datasets/erd" element={<DatasetERDPage />} />
            <Route path="/reporting/view/:id" element={<ReportViewer />} />
            
            {/* GitHub Integration */}
            <Route path="/github" element={<GitHubDashboard />} />
            <Route path="/github/orgs" element={<OrganizationList />} />
            <Route path="/github/commits" element={<CommitList />} />
            <Route path="/github/prs" element={<PullRequestList />} />
            <Route path="/github/repos" element={<RepositoryList />} />
            <Route path="/github/reviews/new" element={<PeerReviewForm />} />
            
            <Route path="/pm/projects/:projectId" element={<ProjectLayout />}>
              <Route index element={<ProjectDashboard />} />
              <Route path="board" element={<KanbanBoard />} />
              <Route path="list" element={<TaskList />} />
              <Route path="tasks/new" element={<TaskForm />} />
              <Route path="tasks/:taskId" element={<TaskForm />} />
              <Route path="members" element={<ProjectMembers />} />
              <Route path="files" element={<ProjectFiles />} />
              <Route path="edit" element={<ProjectForm />} />
            </Route>
          </Route>

          {/* Auth Layout */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}

