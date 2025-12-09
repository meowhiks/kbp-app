import Image from "next/image";

export default function login_page() {
  return (
    <div className="text-center mt-12 text-3xl flex flex-col gap-3 max-w-lg mx-auto">
      <h1>
        Добро пожаловать
      </h1>
    
      <input
        type="text"
        className="mt-12 p-2 border-b border-black px-2 py-1 focus:outline-none text-lg"
        placeholder="Введите фамилию">
      </input>
      <input
        type="date"
        className="mt-12 p-2 border-b border-black px-2 py-1 focus:outline-none text-lg"
      >
      </input>
      <input
        type="text"
        className="mt-12 p-2 border-b border-black px-2 py-1 focus:outline-none text-lg"
        placeholder="Введите группу">
      </input>
      <button
        className="mt-12 border p-2 hover:"
        >
          Войти
      </button>
    </div>
  );
}
