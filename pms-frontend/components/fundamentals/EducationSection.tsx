import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { BookOpen, Lightbulb, ShieldAlert, HelpCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";

export function EducationSection() {
    return (
        <Card className="bg-card/50 backdrop-blur-sm border-primary/10">
            <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Investor Education & Tips
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-primary">
                            <Lightbulb className="h-5 w-5" />
                            <h3 className="font-bold">Smart Investing Tips</h3>
                        </div>
                        <ul className="space-y-3">
                            <li className="text-sm flex gap-3">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                <span>Focus on **long-term value** rather than short-term market noise or rumors.</span>
                            </li>
                            <li className="text-sm flex gap-3">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                <span>Always check the **Promoter Pledge**; high pledging can be a major risk factor in DSE.</span>
                            </li>
                            <li className="text-sm flex gap-3">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                <span>Diversify your portfolio across different sectors to mitigate industry-specific risks.</span>
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-destructive">
                            <ShieldAlert className="h-5 w-5" />
                            <h3 className="font-bold">Common Pitfalls</h3>
                        </div>
                        <ul className="space-y-3">
                            <li className="text-sm flex gap-3">
                                <div className="h-1.5 w-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />
                                <span>Chasing "hot tips" from social media without verifying the company's fundamentals.</span>
                            </li>
                            <li className="text-sm flex gap-3">
                                <div className="h-1.5 w-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />
                                <span>Ignoring **Cash Flow**; a profitable company can still fail if it runs out of cash.</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="pt-6 border-t border-primary/5">
                    <div className="flex items-center gap-2 text-muted-foreground mb-4">
                        <HelpCircle className="h-5 w-5" />
                        <h3 className="font-bold">Glossary of Key Metrics</h3>
                    </div>
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="pe">
                            <AccordionTrigger className="text-sm font-semibold">P/E Ratio (Price-to-Earnings)</AccordionTrigger>
                            <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                                Indicates how much investors are willing to pay for each Taka of profit. A lower P/E relative to industry peers might suggest the stock is undervalued.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="roe">
                            <AccordionTrigger className="text-sm font-semibold">ROE (Return on Equity)</AccordionTrigger>
                            <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                                Measures a corporation's profitability by revealing how much profit a company generates with the money shareholders have invested.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="nav">
                            <AccordionTrigger className="text-sm font-semibold">NAV (Net Asset Value)</AccordionTrigger>
                            <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                                Represents the net value of an entity and is calculated as the total value of the entity's assets minus the total value of its liabilities.
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </CardContent>
        </Card>
    );
}
