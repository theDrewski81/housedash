import DashboardLayout from "@/components/layout/DashboardLayout";
import WeatherWidget from "@/components/widgets/WeatherWidget";
import ScheduleWidget from "@/components/widgets/ScheduleWidget";
import DinnersWidget from "@/components/widgets/DinnersWidget";
import GroceriesWidget from "@/components/widgets/GroceriesWidget";
import BudgetWidget from "@/components/widgets/BudgetWidget";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <WeatherWidget />
        <ScheduleWidget />
        <DinnersWidget />
        <GroceriesWidget />
        <BudgetWidget />
      </div>
    </DashboardLayout>
  );
}
