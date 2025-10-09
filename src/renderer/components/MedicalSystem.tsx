import React, { useState, useEffect } from 'react';
import { Heart, User, Calendar, FileText, Activity, AlertTriangle, Plus, Search, Filter, RefreshCw, Camera } from 'lucide-react';
import { useConfigStore } from '../stores/configStore';
import { toast } from 'sonner';
import { PatientInfoCapture, PatientRecords, AssistantHistory } from './medical';

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  phone: string;
  email: string;
  lastVisit: Date;
  status: 'active' | 'inactive' | 'critical';
  conditions: string[];
  medications: string[];
}

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: Date;
  type: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
}

interface MedicalRecord {
  id: string;
  patientId: string;
  date: Date;
  type: 'consultation' | 'diagnosis' | 'treatment' | 'lab-result';
  title: string;
  content: string;
  attachments?: string[];
}

interface MedicalSystemProps {
  className?: string;
}

const MedicalSystem: React.FC<MedicalSystemProps> = ({ className = '' }) => {
  const { config } = useConfigStore();
  const [activeTab, setActiveTab] = useState<'patients' | 'appointments' | 'records' | 'screen-capture'>('screen-capture');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Initialize medical system data
  useEffect(() => {
    loadMedicalData();
  }, []);

  // Load medical data from API
  const loadMedicalData = async () => {
    if (!config.medical?.enabled) {
      return;
    }

    setIsLoading(true);
    try {
      // Mock data for demonstration
      const mockPatients: Patient[] = [
        {
          id: '1',
          name: '张三',
          age: 45,
          gender: 'male',
          phone: '138-0000-0001',
          email: 'zhangsan@example.com',
          lastVisit: new Date('2024-01-15'),
          status: 'active',
          conditions: ['高血压', '糖尿病'],
          medications: ['降压药', '二甲双胍'],
        },
        {
          id: '2',
          name: '李四',
          age: 32,
          gender: 'female',
          phone: '138-0000-0002',
          email: 'lisi@example.com',
          lastVisit: new Date('2024-01-20'),
          status: 'active',
          conditions: ['偏头痛'],
          medications: ['布洛芬'],
        },
        {
          id: '3',
          name: '王五',
          age: 67,
          gender: 'male',
          phone: '138-0000-0003',
          email: 'wangwu@example.com',
          lastVisit: new Date('2024-01-10'),
          status: 'critical',
          conditions: ['心脏病', '高血压'],
          medications: ['阿司匹林', '降压药', '他汀类药物'],
        },
      ];

      const mockAppointments: Appointment[] = [
        {
          id: '1',
          patientId: '1',
          patientName: '张三',
          date: new Date('2024-01-25 09:00'),
          type: '复查',
          status: 'scheduled',
          notes: '血压监测',
        },
        {
          id: '2',
          patientId: '2',
          patientName: '李四',
          date: new Date('2024-01-25 14:30'),
          type: '初诊',
          status: 'scheduled',
          notes: '头痛症状评估',
        },
        {
          id: '3',
          patientId: '3',
          patientName: '王五',
          date: new Date('2024-01-24 10:00'),
          type: '急诊',
          status: 'completed',
          notes: '胸痛检查',
        },
      ];

      const mockRecords: MedicalRecord[] = [
        {
          id: '1',
          patientId: '1',
          date: new Date('2024-01-15'),
          type: 'consultation',
          title: '高血压复查',
          content: '血压控制良好，继续现有治疗方案。建议定期监测血糖。',
        },
        {
          id: '2',
          patientId: '2',
          date: new Date('2024-01-20'),
          type: 'diagnosis',
          title: '偏头痛诊断',
          content: '确诊为偏头痛，开具布洛芬处方。建议避免诱发因素。',
        },
        {
          id: '3',
          patientId: '3',
          date: new Date('2024-01-10'),
          type: 'lab-result',
          title: '心电图检查',
          content: '心电图显示轻微异常，建议进一步心脏超声检查。',
        },
      ];

      setPatients(mockPatients);
      setAppointments(mockAppointments);
      setRecords(mockRecords);
    } catch (error) {
      console.error('Failed to load medical data:', error);
      toast.error('加载医疗数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter patients based on search and status
  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.phone.includes(searchTerm) ||
                         patient.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || patient.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Filter appointments based on search
  const filteredAppointments = appointments.filter(appointment => 
    appointment.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appointment.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter records based on search and selected patient
  const filteredRecords = records.filter(record => {
    const matchesSearch = record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPatient = !selectedPatient || record.patientId === selectedPatient.id;
    return matchesSearch && matchesPatient;
  });

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'critical': return 'text-red-600 bg-red-100';
      case 'inactive': return 'text-gray-600 bg-gray-100';
      case 'scheduled': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'no-show': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // Format datetime
  const formatDateTime = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 注意: 这些函数已被新的 PatientInfoCapture 组件内部处理
  // 保留以供参考或未来使用
  /*
  const handlePatientInfoExtracted = (info: PatientInfo) => {
    toast.success('患者信息已提取');
  };

  const handlePatientInfoUpdate = (info: PatientInfo) => {
    toast.success('患者信息已更新');
  };

  const handleConfirmAndGetRecommendations = async (info: PatientInfo) => {
    // 现在由 PatientInfoCapture 组件内部处理
  };

  const handleFeedback = async (recommendationId: number, feedbackType: 'accepted' | 'rejected', comment?: string) => {
    // 现在由 PatientInfoCapture 组件内部处理
  };
  */

  // 渲染屏幕捕获tab
  const renderScreenCaptureTab = () => (
    <div className="space-y-6">
      <PatientInfoCapture />
    </div>
  );

  // 替换为“患者记录”调阅
  const renderPatientsTab = () => (
    <div className="space-y-4">
      <PatientRecords />
    </div>
  );

  const renderAssistantHistoryTab = () => (
    <div className="space-y-4">
      <AssistantHistory />
    </div>
  );

  // Render appointments tab
  const renderAppointmentsTab = () => (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="搜索预约患者或类型..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Appointments list */}
      <div className="space-y-3">
        {filteredAppointments.map((appointment) => (
          <div
            key={appointment.id}
            className="p-4 border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                
                <div>
                  <div className="flex items-center space-x-3 mb-1">
                    <h3 className="font-medium">{appointment.patientName}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {appointment.status === 'scheduled' ? '已预约' :
                       appointment.status === 'completed' ? '已完成' :
                       appointment.status === 'cancelled' ? '已取消' : '未到'}
                    </span>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <div>时间: {formatDateTime(appointment.date)}</div>
                    <div>类型: {appointment.type}</div>
                    {appointment.notes && <div>备注: {appointment.notes}</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredAppointments.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">没有找到匹配的预约</p>
        </div>
      )}
    </div>
  );

  // Render records tab
  const renderRecordsTab = () => (
    <div className="space-y-4">
      {/* Search and patient filter */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索病历标题或内容..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        
        <select
          value={selectedPatient?.id || ''}
          onChange={(e) => {
            const patient = patients.find(p => p.id === e.target.value);
            setSelectedPatient(patient || null);
          }}
          className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">全部患者</option>
          {patients.map(patient => (
            <option key={patient.id} value={patient.id}>{patient.name}</option>
          ))}
        </select>
      </div>

      {/* Records list */}
      <div className="space-y-3">
        {filteredRecords.map((record) => {
          const patient = patients.find(p => p.id === record.patientId);
          return (
            <div
              key={record.id}
              className="p-4 border border-border rounded-lg hover:bg-accent transition-colors"
            >
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-medium">{record.title}</h3>
                    <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
                      {record.type === 'consultation' ? '咨询' :
                       record.type === 'diagnosis' ? '诊断' :
                       record.type === 'treatment' ? '治疗' : '检查结果'}
                    </span>
                  </div>
                  
                  <div className="text-sm text-muted-foreground mb-2">
                    <div>患者: {patient?.name}</div>
                    <div>日期: {formatDate(record.date)}</div>
                  </div>
                  
                  <div className="text-sm">
                    {record.content}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {filteredRecords.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">没有找到匹配的病历</p>
        </div>
      )}
    </div>
  );

  if (!config.medical?.enabled) {
    return (
      <div className={`flex items-center justify-center h-full bg-background ${className}`}>
        <div className="text-center">
          <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">医疗系统未启用</h3>
          <p className="text-sm text-muted-foreground mb-4">
            请在设置中启用医疗系统集成功能
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-background ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold">医疗系统</h2>
          <p className="text-sm text-muted-foreground">
            管理患者信息、预约和病历记录
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-sm text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>已连接</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8 px-4">
          {[
            { id: 'screen-capture', label: '智能识别', icon: Camera },
            { id: 'patients', label: '患者记录', icon: User },
            { id: 'assistant-history', label: '助手对话', icon: Activity },
            { id: 'appointments', label: '预约管理', icon: Calendar },
            { id: 'records', label: '病历记录', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && activeTab !== 'screen-capture' ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-muted-foreground">加载中...</span>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'screen-capture' && renderScreenCaptureTab()}
            {activeTab === 'patients' && renderPatientsTab()}
            {activeTab === 'assistant-history' && renderAssistantHistoryTab()}
            {activeTab === 'appointments' && renderAppointmentsTab()}
            {activeTab === 'records' && renderRecordsTab()}
          </>
        )}
      </div>
    </div>
  );
};

export default MedicalSystem;
