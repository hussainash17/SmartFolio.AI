import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { BookOpen, FileText, LifeBuoy, Mail, MessageCircle, Search, Video } from "lucide-react";

export function HelpSupportView() {
    const [searchQuery, setSearchQuery] = useState("");

    const faqs = [
        {
            question: "How do I reset my password?",
            answer: "You can reset your password by going to Settings > Security and clicking on 'Change Password'. If you cannot log in, use the 'Forgot Password' link on the login page."
        },
        {
            question: "How is my portfolio performance calculated?",
            answer: "We use Time-Weighted Return (TWR) to calculate your portfolio performance. This method eliminates the distorting effects of cash inflows and outflows, giving you a true picture of your investment skills."
        },
        {
            question: "Can I export my trading data?",
            answer: "Yes, you can export your complete trading history and portfolio data in CSV format from the Settings > Data tab."
        },
        {
            question: "What are the trading hours?",
            answer: "The platform follows the Dhaka Stock Exchange (DSE) trading hours, which are typically from 10:00 AM to 2:30 PM, Sunday through Thursday, excluding public holidays."
        },
        {
            question: "Is my data secure?",
            answer: "Absolutely. We use industry-standard encryption for all data transmission and storage. We also offer Two-Factor Authentication (2FA) for an extra layer of security."
        }
    ];

    const filteredFaqs = faqs.filter(faq =>
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="container max-w-6xl mx-auto p-6 space-y-8">
            {/* Header Section */}
            <div className="text-center space-y-4 py-8">
                <h1 className="text-4xl font-bold tracking-tight">How can we help you?</h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Search our knowledge base or browse frequently asked questions.
                </p>
                <div className="max-w-md mx-auto relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search for help..."
                        className="pl-10 h-12 text-lg"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary" />
                            Getting Started
                        </CardTitle>
                        <CardDescription>
                            New to the platform? Start here.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="hover:text-primary hover:underline">Platform Tour</li>
                            <li className="hover:text-primary hover:underline">Setting up your portfolio</li>
                            <li className="hover:text-primary hover:underline">Placing your first trade</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Video className="h-5 w-5 text-primary" />
                            Video Tutorials
                        </CardTitle>
                        <CardDescription>
                            Watch step-by-step guides.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="hover:text-primary hover:underline">Advanced Charting</li>
                            <li className="hover:text-primary hover:underline">Risk Management Tools</li>
                            <li className="hover:text-primary hover:underline">Understanding Reports</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Documentation
                        </CardTitle>
                        <CardDescription>
                            Detailed technical documentation.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="hover:text-primary hover:underline">API Reference</li>
                            <li className="hover:text-primary hover:underline">Fee Schedule</li>
                            <li className="hover:text-primary hover:underline">Terms of Service</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>

            {/* FAQs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-2xl font-semibold">Frequently Asked Questions</h2>
                    <Accordion type="single" collapsible className="w-full">
                        {filteredFaqs.map((faq, index) => (
                            <AccordionItem key={index} value={`item-${index}`}>
                                <AccordionTrigger>{faq.question}</AccordionTrigger>
                                <AccordionContent>
                                    {faq.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                    {filteredFaqs.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            No results found for "{searchQuery}".
                        </div>
                    )}
                </div>

                {/* Contact Support */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Still need help?</h2>
                    <Card>
                        <CardHeader>
                            <CardTitle>Contact Support</CardTitle>
                            <CardDescription>
                                Our team is available 24/7 to assist you.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button className="w-full justify-start" variant="outline">
                                <MessageCircle className="mr-2 h-4 w-4" />
                                Live Chat
                            </Button>
                            <Button className="w-full justify-start" variant="outline">
                                <Mail className="mr-2 h-4 w-4" />
                                Email Support
                            </Button>
                            <Button className="w-full justify-start" variant="outline">
                                <LifeBuoy className="mr-2 h-4 w-4" />
                                Open Ticket
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
