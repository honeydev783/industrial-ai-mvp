import React from "react";
import { Link } from "react-router-dom";
import darkLogo from "../../dark_logo.png";
import lightLogo from "../../light_logo.png";
import { useTheme } from "@/contexts/ThemeContext";
type LogoSize = "sm" | "md" | "lg";

interface LogoProps {
  size?: LogoSize;
}

const sizeMap: Record<LogoSize, string> = {
  sm: "h-6 w-6 text-base",
  md: "h-10 w-10 text-xl",
  lg: "h-14 w-14 text-2xl",
};

const Logo: React.FC<LogoProps> = ({ size = "md" }) => {
  const sizeClasses = sizeMap[size].split(" ");
  const [imgSize, textSize] = sizeClasses;
  const { theme } = useTheme(); // Get current theme from context
  return (
    <Link to="/" className="flex items-center space-x-2">
      <img
        src={ theme === "dark" ? darkLogo : lightLogo}
        alt="Datonyx Logo"
        className={`object-contain  ${imgSize}`}
      />
      
      {/* <span className={`font-bold text-gray-800 ${textSize}`}>MyApp</span> */}
    </Link>
  );
};

export default Logo;