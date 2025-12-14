import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  AlertCircle, 
  Clock, 
  CheckCircle,
  Activity,
  Heart,
  Brain,
  Stethoscope
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface StatCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  description, 
  icon, 
  trend, 
  color = 'blue' 
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200'
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-1">
          {description && <p>{description}</p>}
          {trend && (
            <div className={`flex items-center ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className={`h-3 w-3 mr-1 ${trend.isPositive ? '' : 'rotate-180'}`} />
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

const QuickAction: React.FC<QuickActionProps> = ({ 
  title, 
  description, 
  icon, 
  onClick, 
  variant = 'primary' 
}) => {
  return (
    <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-primary/10 rounded-lg text-primary">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button 
          variant={variant} 
          className="w-full mt-4"
          onClick={onClick}
        >
          {title}
        </Button>
      </CardContent>
    </Card>
  );
};

interface DashboardOverviewProps {
  stats: {
    totalPatients: number;
    todayAppointments: number;
    pendingAppointments: number;
    completedAppointments: number;
    newPatientsThisMonth: number;
    upcomingAppointments: number;
  };
  recentActivity: Array<{
    id: string;
    type: 'appointment' | 'patient' | 'session';
    title: string;
    description: string;
    time: Date;
    status?: 'completed' | 'pending' | 'cancelled';
  }>;
  onNavigate: (path: string) => void;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  stats,
  recentActivity,
  onNavigate
}) => {
  const today = format(new Date(), 'EEEE, d MMMM yyyy', { locale: es });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Dashboard Psiquiátrico
        </h1>
        <p className="text-muted-foreground">
          {today}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Pacientes"
          value={stats.totalPatients}
          description="Pacientes activos"
          icon={<Users className="h-5 w-5" />}
          color="blue"
          trend={{ value: 12, isPositive: true }}
        />
        
        <StatCard
          title="Citas de Hoy"
          value={stats.todayAppointments}
          description="Programadas para hoy"
          icon={<Calendar className="h-5 w-5" />}
          color="green"
        />
        
        <StatCard
          title="Pendientes"
          value={stats.pendingAppointments}
          description="Por confirmar"
          icon={<Clock className="h-5 w-5" />}
          color="orange"
        />
        
        <StatCard
          title="Completadas"
          value={stats.completedAppointments}
          description="Finalizadas hoy"
          icon={<CheckCircle className="h-5 w-5" />}
          color="purple"
          trend={{ value: 8, isPositive: true }}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <QuickAction
          title="Nuevo Paciente"
          description="Registrar un nuevo paciente en el sistema"
          icon={<Users className="h-6 w-6" />}
          onClick={() => onNavigate('/patients/new')}
        />
        
        <QuickAction
          title="Programar Cita"
          description="Agendar una nueva consulta"
          icon={<Calendar className="h-6 w-6" />}
          onClick={() => onNavigate('/appointments/new')}
        />
        
        <QuickAction
          title="Ver Historial Clínico"
          description="Consultar registros médicos"
          icon={<Brain className="h-6 w-6" />}
          onClick={() => onNavigate('/patients')}
        />
      </div>

      {/* Recent Activity & Upcoming */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-primary" />
              <span>Actividad Reciente</span>
            </CardTitle>
            <CardDescription>
              Últimas acciones realizadas en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    {activity.type === 'appointment' && <Calendar className="h-4 w-4 text-primary" />}
                    {activity.type === 'patient' && <Users className="h-4 w-4 text-primary" />}
                    {activity.type === 'session' && <Stethoscope className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {activity.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(activity.time, 'HH:mm')}
                    </p>
                  </div>
                  {activity.status && (
                    <div className={`w-2 h-2 rounded-full ${
                      activity.status === 'completed' ? 'bg-green-500' :
                      activity.status === 'pending' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-primary" />
              <span>Agenda de Hoy</span>
            </CardTitle>
            <CardDescription>
              Citas programadas para hoy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.todayAppointments === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No hay citas programadas para hoy
                  </p>
                </div>
              ) : (
                Array.from({ length: Math.min(stats.todayAppointments, 4) }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Paciente #{index + 1}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(), 'HH:mm')} - Consulta
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        Ver
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOverview;