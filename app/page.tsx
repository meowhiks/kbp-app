"use client";

import { useState, useEffect } from "react";
import CustomSelect from "./components/CustomSelect";

interface Group {
  id: string;
  name: string;
}

export default function LoginPage() {
  const [surname, setSurname] = useState("");
  const [date, setDate] = useState("");
  const [group, setGroup] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await fetch("/api/groups");
        const result = await response.json();
        if (result.success && result.groups) {
          setGroups(result.groups);
        }
      } catch (err) {
        console.error("Error fetching groups:", err);
      } finally {
        setLoadingGroups(false);
      }
    };
    fetchGroups();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!group) {
      setError("Пожалуйста, выберите группу");
      setLoading(false);
      return;
    }

    try {
      // Форматируем дату в нужный формат (YYYY-MM-DD -> DD.MM.YYYY или как требуется)
      const formattedDate = date.split("-").reverse().join(".");

      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_name: surname,
          group_id: group,
          birth_day: formattedDate,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Сохраняем данные для входа в localStorage (для автоматического перевхода)
        const loginData = {
          student_name: surname,
          group_id: group,
          birth_day: formattedDate,
        };
        localStorage.setItem("ej_login_data", JSON.stringify(loginData));
        localStorage.setItem("ej_group_id", group);
        
        // Если ответ содержит cookies, сохраняем их
        if (result.cookies) {
          localStorage.setItem("ej_cookies", result.cookies);
          
          // Запрашиваем журнал
          try {
            const journalResponse = await fetch("/api/journal", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                cookies: result.cookies,
              }),
            });
            
            const journalResult = await journalResponse.json();
            if (journalResult.success) {
              // Сохраняем данные журнала
              localStorage.setItem("journal_data", JSON.stringify(journalResult.data));
            }
          } catch (journalError) {
            console.error("Error fetching journal:", journalError);
          }
        }
        
        // Перенаправляем на dashboard
        window.location.href = "/dashboard";
      } else {
        setError(result.error || "Ошибка входа. Проверьте данные.");
      }
    } catch (err) {
      setError("Произошла ошибка при входе");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-16">
      <div className="w-full max-w-sm mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-medium text-gray-900 mb-1">
            Электронный журнал
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <input
              type="text"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              className="w-full bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none text-base"
              placeholder="Фамилия"
              required
            />
          </div>

          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-transparent text-gray-900 focus:outline-none text-base"
              required
            />
          </div>

          <div>
            <CustomSelect
              options={groups}
              value={group}
              onChange={setGroup}
              placeholder={loadingGroups ? "Загрузка групп..." : "Выберите группу"}
              disabled={loadingGroups}
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center mt-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#3390ec] hover:bg-[#2d7fd6] active:bg-[#2870c0] disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-colors mt-6"
          >
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
