import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
export default function AuthForm() {
  const [, setLocation] = useLocation();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    userType: "viewer",
  });
  const { login } = useAuth();
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

    // if (!emailRegex.test(form.email)) {
    //   alert("Please enter a valid email address.");
    //   return;
    // }
    const demoCredentials = {
      email: "demo@gmail.com",
      password: "password123",
    };
    if (isResetMode) {
      // Handle reset password logic
    } else if (isSignUp) {
      // Handle signup logic
      alert("Signed up successfully (simulated).");
      login({
        email: form.email,
        username: form.username,
        userType: form.userType,
      });
    } else {
      // Handle signin logic
      if (
        form.email === demoCredentials.email &&
        form.password === demoCredentials.password
      ) {
        login({
          email: form.email,
          username: "DemoUser",
          userType: "viewer",
        });
        setLocation("/");
      } else {
        alert("Invalid credentials. Try demo@gmail.com / password123.");
      }
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-2xl font-bold text-center">
            {isResetMode ? "Reset Password" : isSignUp ? "Sign Up" : "Sign In"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  required
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            {!isResetMode && (
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>
            )}
            {isSignUp && (
              <div>
                <Label htmlFor="userType">User Type</Label>
                <Select
                  name="userType"
                  value={form.userType}
                  onValueChange={(value) =>
                    setForm({ ...form, userType: value })
                  }
                >
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="trainer">Trainer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </Select>
              </div>
            )}
            <Button type="submit" className="w-full">
              {isResetMode
                ? "Send Reset Link"
                : isSignUp
                ? "Sign Up"
                : "Sign In"}
            </Button>
          </form>
          <div className="text-sm text-center space-y-1">
            {!isResetMode && (
              <p>
                {isSignUp
                  ? "Already have an account?"
                  : "Don't have an account?"}{" "}
                <button
                  type="button"
                  className="text-blue-600 hover:underline"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setIsResetMode(false);
                  }}
                >
                  {isSignUp ? "Sign In" : "Sign Up"}
                </button>
              </p>
            )}
            <p>
              <button
                type="button"
                className="text-blue-600 hover:underline"
                onClick={() => {
                  setIsResetMode(!isResetMode);
                  setIsSignUp(false);
                }}
              >
                {isResetMode ? "Back to Sign In" : "Forgot Password?"}
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
