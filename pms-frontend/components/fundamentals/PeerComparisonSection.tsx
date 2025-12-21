import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";

interface PeerData {
    symbol: string;
    price: number;
    pe: number;
    pb: number;
    divYield: number;
    roe: number;
}

interface PeerComparisonSectionProps {
    peers: PeerData[];
    currentSymbol: string;
}

export function PeerComparisonSection({ peers, currentSymbol }: PeerComparisonSectionProps) {
    return (
        <Card className="bg-card/50 backdrop-blur-sm border-primary/10">
            <CardHeader>
                <CardTitle className="text-xl font-bold">Peer Comparison</CardTitle>
                <p className="text-sm text-muted-foreground">Compare with similar companies in the sector</p>
            </CardHeader>
            <CardContent>
                <div className="rounded-xl border border-primary/5 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-primary/5">
                            <TableRow>
                                <TableHead className="font-bold">Company</TableHead>
                                <TableHead className="text-right font-bold">Price (BDT)</TableHead>
                                <TableHead className="text-right font-bold">P/E Ratio</TableHead>
                                <TableHead className="text-right font-bold">P/B Ratio</TableHead>
                                <TableHead className="text-right font-bold">Div. Yield</TableHead>
                                <TableHead className="text-right font-bold">ROE</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {peers.map((peer) => (
                                <TableRow
                                    key={peer.symbol}
                                    className={peer.symbol === currentSymbol ? "bg-primary/10" : ""}
                                >
                                    <TableCell className="font-semibold">
                                        <div className="flex items-center gap-2">
                                            {peer.symbol}
                                            {peer.symbol === currentSymbol && (
                                                <Badge variant="secondary" className="text-[10px] h-4 px-1">Current</Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">{peer.price.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-medium text-green-500">{peer.pe.toFixed(1)}</TableCell>
                                    <TableCell className="text-right">{peer.pb.toFixed(1)}</TableCell>
                                    <TableCell className="text-right text-yellow-500">{peer.divYield.toFixed(1)}%</TableCell>
                                    <TableCell className="text-right">{peer.roe.toFixed(1)}%</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
