import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import VehiclesList from "./pages/Vehicles/VehiclesList";
import VehicleDetail from "./pages/Vehicles/VehicleDetail";
import VehicleForm from "./pages/Vehicles/VehicleForm";
import CustomersList from "./pages/Customers/CustomersList";
import CustomerDetail from "./pages/Customers/CustomerDetail";
import CustomerForm from "./pages/Customers/CustomerForm";
import ReservationsList from "./pages/Reservations/ReservationsList";
import ReservationForm from "./pages/Reservations/ReservationForm";
import ContractsList from "./pages/Contracts/ContractsList";
import ContractDetail from "./pages/Contracts/ContractDetail";
import ContractForm from "./pages/Contracts/ContractForm";
import HandoverForm from "./pages/Handovers/HandoverForm";
import ReturnForm from "./pages/Returns/ReturnForm";
import PaymentsList from "./pages/Payments/PaymentsList";
import TransfersList from "./pages/Transfers/TransfersList";
import TransferForm from "./pages/Transfers/TransferForm";
import MaintenanceList from "./pages/Maintenance/MaintenanceList";
import MaintenanceForm from "./pages/Maintenance/MaintenanceForm";
import ReportsPage from "./pages/Reports/ReportsPage";
import AlertsPage from "./pages/Alerts/AlertsPage";
import SettingsPage from "./pages/Settings/SettingsPage";
import AuditLogPage from "./pages/AuditLog/AuditLogPage";
import LoginPage from "./pages/Auth/LoginPage";
import RegisterPage from "./pages/Auth/RegisterPage";
import ProfilePage from "./pages/Profile/ProfilePage";
import CustomerProfile from "./pages/Customers/CustomerProfile";
import PendingApprovalPage from "./pages/Auth/PendingApprovalPage";
import ForgotPasswordPage from "./pages/Auth/ForgotPasswordPage";
import AcceptInvitePage from "./pages/Auth/AcceptInvitePage";
import StaffManagementPage from "./pages/Staff/StaffManagementPage";
import LiveMapPage from "./pages/Tracking/LiveMapPage";

function DashboardRouter() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/vehicles" component={VehiclesList} />
        <Route path="/vehicles/new" component={VehicleForm} />
        <Route path="/vehicles/:id" component={VehicleDetail} />
        <Route path="/vehicles/:id/edit" component={VehicleForm} />
        <Route path="/tracking" component={LiveMapPage} />
        <Route path="/customers" component={CustomersList} />
        <Route path="/customers/new" component={CustomerForm} />
        <Route path="/customers/:id/profile" component={CustomerProfile} />
        <Route path="/customers/:id" component={CustomerDetail} />
        <Route path="/customers/:id/edit" component={CustomerForm} />
        <Route path="/reservations" component={ReservationsList} />
        <Route path="/reservations/new" component={ReservationForm} />
        <Route path="/contracts" component={ContractsList} />
        <Route path="/contracts/new" component={ContractForm} />
        <Route path="/contracts/:id" component={ContractDetail} />
        <Route path="/contracts/:id/handover" component={HandoverForm} />
        <Route path="/contracts/:id/return" component={ReturnForm} />
        <Route path="/payments" component={PaymentsList} />
        <Route path="/transfers" component={TransfersList} />
        <Route path="/transfers/new" component={TransferForm} />
        <Route path="/maintenance" component={MaintenanceList} />
        <Route path="/maintenance/new" component={MaintenanceForm} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/alerts" component={AlertsPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/audit-log" component={AuditLogPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/staff" component={StaffManagementPage} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Auth pages - outside DashboardLayout */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/pending-approval" component={PendingApprovalPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/accept-invite" component={AcceptInvitePage} />
      {/* All other routes go through DashboardLayout */}
      <Route component={DashboardRouter} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-center" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
