import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { Bell, Globe, Lock, Moon, Palette, Save, Shield, Smartphone, Trash2, User, Sun, Monitor } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "../hooks/useTheme";

export function SettingsView() {
    const [loading, setLoading] = useState(false);
    const { theme, setTheme } = useTheme();

    const handleSave = () => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            toast.success("Settings saved successfully");
        }, 1000);
    };

    const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
        setTheme(newTheme);
        toast.success(`Theme changed to ${newTheme === "system" ? "System" : newTheme === "dark" ? "Dark" : "Light"}`);
    };

    return (
        <div className="container max-w-6xl mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage your account settings and preferences.
                    </p>
                </div>
                <Button onClick={handleSave} disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                </Button>
            </div>

            <Tabs defaultValue="general" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1">
                    <TabsTrigger value="general" className="py-2">General</TabsTrigger>
                    <TabsTrigger value="notifications" className="py-2">Notifications</TabsTrigger>
                    <TabsTrigger value="appearance" className="py-2">Appearance</TabsTrigger>
                    <TabsTrigger value="security" className="py-2">Security</TabsTrigger>
                    <TabsTrigger value="data" className="py-2">Data</TabsTrigger>
                </TabsList>

                {/* General Settings */}
                <TabsContent value="general" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Globe className="h-5 w-5" />
                                Language & Region
                            </CardTitle>
                            <CardDescription>
                                Set your preferred language and regional settings.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="language">Language</Label>
                                    <Select defaultValue="en">
                                        <SelectTrigger id="language">
                                            <SelectValue placeholder="Select language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="en">English (US)</SelectItem>
                                            <SelectItem value="bn">Bengali</SelectItem>
                                            <SelectItem value="es">Spanish</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="currency">Currency</Label>
                                    <Select defaultValue="usd">
                                        <SelectTrigger id="currency">
                                            <SelectValue placeholder="Select currency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="usd">USD ($)</SelectItem>
                                            <SelectItem value="bdt">BDT (৳)</SelectItem>
                                            <SelectItem value="eur">EUR (€)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="timezone">Timezone</Label>
                                    <Select defaultValue="dhaka">
                                        <SelectTrigger id="timezone">
                                            <SelectValue placeholder="Select timezone" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="dhaka">Asia/Dhaka (GMT+6)</SelectItem>
                                            <SelectItem value="utc">UTC (GMT+0)</SelectItem>
                                            <SelectItem value="est">Eastern Time (GMT-5)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dateFormat">Date Format</Label>
                                    <Select defaultValue="medium">
                                        <SelectTrigger id="dateFormat">
                                            <SelectValue placeholder="Select date format" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="medium">Oct 24, 2024</SelectItem>
                                            <SelectItem value="short">10/24/2024</SelectItem>
                                            <SelectItem value="iso">2024-10-24</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Profile Information
                            </CardTitle>
                            <CardDescription>
                                Update your personal details.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Display Name</Label>
                                    <Input id="name" defaultValue="John Doe" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input id="email" defaultValue="john@example.com" disabled />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <Input id="phone" placeholder="+880 1..." />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Notifications Settings */}
                <TabsContent value="notifications" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="h-5 w-5" />
                                Notification Preferences
                            </CardTitle>
                            <CardDescription>
                                Choose how you want to be notified about important updates.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between space-x-2">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Email Notifications</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Receive daily summaries and important alerts via email.
                                    </p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between space-x-2">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Push Notifications</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Receive real-time alerts on your device.
                                    </p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between space-x-2">
                                <div className="space-y-0.5">
                                    <Label className="text-base">SMS Alerts</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Get text messages for critical security events.
                                    </p>
                                </div>
                                <Switch />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between space-x-2">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Marketing Emails</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Receive offers and updates about new features.
                                    </p>
                                </div>
                                <Switch />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Appearance Settings */}
                <TabsContent value="appearance" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Palette className="h-5 w-5" />
                                Theme & Display
                            </CardTitle>
                            <CardDescription>
                                Customize the look and feel of the application.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Theme</Label>
                                <div className="grid grid-cols-3 gap-4">
                                    <div 
                                        onClick={() => handleThemeChange("light")}
                                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:bg-accent ${
                                            theme === "light" ? "border-primary bg-accent" : "border-border"
                                        }`}
                                    >
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-16 w-full bg-white rounded-md border shadow-sm flex items-center justify-center">
                                                <Sun className="h-6 w-6 text-yellow-500" />
                                            </div>
                                            <div className="text-center">
                                                <div className="text-sm font-medium">Light</div>
                                                <div className="text-xs text-muted-foreground">Always light</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div 
                                        onClick={() => handleThemeChange("dark")}
                                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:bg-accent ${
                                            theme === "dark" ? "border-primary bg-accent" : "border-border"
                                        }`}
                                    >
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-16 w-full bg-slate-950 rounded-md border shadow-sm flex items-center justify-center">
                                                <Moon className="h-6 w-6 text-blue-400" />
                                            </div>
                                            <div className="text-center">
                                                <div className="text-sm font-medium">Dark</div>
                                                <div className="text-xs text-muted-foreground">Always dark</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div 
                                        onClick={() => handleThemeChange("system")}
                                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:bg-accent ${
                                            theme === "system" ? "border-primary bg-accent" : "border-border"
                                        }`}
                                    >
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-16 w-full bg-gradient-to-br from-white via-gray-400 to-slate-950 rounded-md border shadow-sm flex items-center justify-center">
                                                <Monitor className="h-6 w-6 text-gray-600" />
                                            </div>
                                            <div className="text-center">
                                                <div className="text-sm font-medium">System</div>
                                                <div className="text-xs text-muted-foreground">Follow system</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between space-x-2">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Compact Mode</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Reduce spacing to show more content on the screen.
                                    </p>
                                </div>
                                <Switch />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Security Settings */}
                <TabsContent value="security" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="h-5 w-5" />
                                Password & Authentication
                            </CardTitle>
                            <CardDescription>
                                Manage your password and security settings.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="current-password">Current Password</Label>
                                <Input id="current-password" type="password" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="new-password">New Password</Label>
                                    <Input id="new-password" type="password" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                                    <Input id="confirm-password" type="password" />
                                </div>
                            </div>
                            <Button variant="outline" className="mt-2">Change Password</Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Two-Factor Authentication
                            </CardTitle>
                            <CardDescription>
                                Add an extra layer of security to your account.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between space-x-2">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Enable 2FA</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Secure your account with an authenticator app.
                                    </p>
                                </div>
                                <Switch />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Data Settings */}
                <TabsContent value="data" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Save className="h-5 w-5" />
                                Data Management
                            </CardTitle>
                            <CardDescription>
                                Manage your data export and retention settings.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Export Data</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Download a copy of your personal data and trading history.
                                    </p>
                                </div>
                                <Button variant="outline">Export CSV</Button>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base text-red-600">Delete Account</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Permanently delete your account and all associated data.
                                    </p>
                                </div>
                                <Button variant="destructive">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Account
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
