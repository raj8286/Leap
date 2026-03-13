const AuthImagePattern = ({ title, subtitle }) => {
  return (
    <div className="hidden lg:flex flex-col items-center justify-between p-10 bg-base-100 border-l border-base-300">
      <div className="flex-1 w-full flex items-center justify-center">
        <img
          src="/assets/chat.svg"
          alt="Chat illustration"
          className="w-[78%] max-w-[620px] object-contain"
        />
      </div>
      <div className="text-center max-w-xl pb-2">
        <h2 className="text-4xl font-bold mb-3">{title}</h2>
        <p className="text-2xl text-base-content/65">{subtitle}</p>
      </div>
    </div>
  );
};

export default AuthImagePattern;
