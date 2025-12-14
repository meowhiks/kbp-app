import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { api } from '../services/api';
import { storage } from '../utils/storage';
import JournalTable from '../components/JournalTable';

type DashboardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

export default function DashboardScreen() {
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const [journalData, setJournalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const performAutoLogin = async () => {
      const loginData = await storage.getLoginData();
      if (!loginData) {
        setError('Данные для входа не найдены. Пожалуйста, войдите снова.');
        setLoading(false);
        return;
      }

      try {
        const result = await api.login(
          loginData.student_name,
          loginData.group_id,
          loginData.birth_day
        );

        if (result.success && result.cookies) {
          await storage.setCookies(result.cookies);
          await fetchJournal(result.cookies);
        } else {
          setError(result.error || 'Ошибка входа');
          setLoading(false);
        }
      } catch (err) {
        console.error('Auto login error:', err);
        setError('Ошибка автоматического входа');
        setLoading(false);
      }
    };

    const fetchJournal = async (cookies: string, showLoading: boolean = true) => {
      try {
        if (showLoading) {
          setLoading(true);
        }
        const journalResult = await api.getJournal(cookies);
        if (journalResult.success && journalResult.data) {
          await storage.setJournalData(journalResult.data);
          setJournalData(journalResult.data);
          setError('');
          setLoading(false);
        } else {
          if (!journalData) {
            setError('Не удалось обновить журнал. Используются сохраненные данные.');
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Error fetching journal:', err);
        if (!journalData) {
          await performAutoLogin();
        } else {
          setLoading(false);
        }
      }
    };

    const loadData = async () => {
      const savedJournal = await storage.getJournalData();
      if (savedJournal && savedJournal.subjects && savedJournal.subjects.length > 0) {
        setJournalData(savedJournal);
        setLoading(false);
        setError('');
        
        const savedCookies = await storage.getCookies();
        if (savedCookies) {
          fetchJournal(savedCookies, false);
        } else {
          const loginData = await storage.getLoginData();
          if (loginData) {
            try {
              const result = await api.login(
                loginData.student_name,
                loginData.group_id,
                loginData.birth_day
              );
              if (result.success && result.cookies) {
                await storage.setCookies(result.cookies);
                fetchJournal(result.cookies, false);
              }
            } catch (err) {
              console.error('Background auto login error:', err);
            }
          }
        }
        return;
      }
      
      const savedCookies = await storage.getCookies();
      
      if (savedCookies) {
        await fetchJournal(savedCookies);
      } else {
        await performAutoLogin();
      }
    };

    loadData();
  }, []);

  const handleLogout = async () => {
    await storage.clearAll();
    navigation.replace('Login');
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3390EC" />
        <Text style={styles.loadingText}>Загрузка журнала...</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    );
  }

  if (error && !journalData) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Ошибка загрузки</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={handleLogout}>
          <Text style={styles.buttonText}>Войти заново</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!journalData || !journalData.subjects || journalData.subjects.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Данные журнала не найдены</Text>
        <Text style={styles.errorText}>
          Пожалуйста, войдите снова для получения данных
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleLogout}>
          <Text style={styles.buttonText}>Войти</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        <Text style={styles.title}>Электронный журнал</Text>

        <JournalTable journalData={journalData} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentWrapper: {
    flex: 1,
    padding: 16,
    maxWidth: '100%',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 8,
  },
  errorText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#3390EC',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

