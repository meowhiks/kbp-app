import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { api, Group } from '../services/api';
import { storage } from '../utils/storage';
import CustomSelect from '../components/CustomSelect';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [surname, setSurname] = useState('');
  const [date, setDate] = useState('');
  const [group, setGroup] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const cachedGroups = await storage.getGroups();
        if (cachedGroups && cachedGroups.length > 0) {
          console.log(`[LoginScreen] Loaded ${cachedGroups.length} groups from cache`);
          setGroups(cachedGroups);
          setLoadingGroups(false);
        }
        
        console.log('[LoginScreen] Fetching groups from API...');
        const groupsData = await api.getGroups(true);
        console.log('[LoginScreen] API returned:', {
          data: groupsData,
          length: groupsData?.length || 0,
          isArray: Array.isArray(groupsData),
        });
        
        if (groupsData && Array.isArray(groupsData) && groupsData.length > 0) {
          console.log(`[LoginScreen] Setting ${groupsData.length} groups to state`);
          setGroups(groupsData);
        } else if (!cachedGroups || cachedGroups.length === 0) {
          console.error('[LoginScreen] No groups available');
          setError('Не удалось загрузить список групп. Проверьте подключение к интернету.');
        }
      } catch (err) {
        console.error('[LoginScreen] Error fetching groups:', err);
        const cachedGroups = await storage.getGroups();
        if (cachedGroups && cachedGroups.length > 0) {
          console.log(`[LoginScreen] Using ${cachedGroups.length} cached groups due to error`);
          setGroups(cachedGroups);
        } else {
          setError('Не удалось загрузить список групп. Проверьте подключение к интернету.');
        }
      } finally {
        console.log('[LoginScreen] Groups loading finished');
        setLoadingGroups(false);
      }
    };
    fetchGroups();
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    if (!group) {
      setError('Пожалуйста, выберите группу');
      setLoading(false);
      return;
    }

    try {
      const formattedDate = date.split('-').reverse().join('.');

      const result = await api.login(surname, group, formattedDate);

      if (result.success && result.cookies) {
        const loginData = {
          student_name: surname,
          group_id: group,
          birth_day: formattedDate,
        };

        await storage.setLoginData(loginData);
        await storage.setGroupId(group);
        await storage.setCookies(result.cookies);

        try {
          const journalResult = await api.getJournal(result.cookies);
          if (journalResult.success && journalResult.data) {
            await storage.setJournalData(journalResult.data);
          }
        } catch (journalError) {
          console.error('Error fetching journal:', journalError);
        }

        navigation.replace('Dashboard');
      } else {
        setError(result.error || 'Ошибка входа. Проверьте данные.');
      }
    } catch (err) {
      setError('Произошла ошибка при входе');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Электронный журнал</Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={surname}
                onChangeText={setSurname}
                placeholder="Фамилия"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="Дата рождения (YYYY-MM-DD)"
                placeholderTextColor="#9CA3AF"
                keyboardType="default"
              />
            </View>

            <CustomSelect
              options={groups}
              value={group}
              onChange={setGroup}
              placeholder={loadingGroups ? 'Загрузка групп...' : 'Выберите группу'}
              disabled={loadingGroups}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Войти</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    gap: 12,
  },
  inputContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    fontSize: 16,
    color: '#111827',
  },
  error: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#3390EC',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

