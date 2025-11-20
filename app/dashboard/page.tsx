"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AddCompanyDialog from "@/components/AddCompanyDialog";
import { CalendarDays, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";

interface Company {
  id: string;
  companyName: string;
  companyNumber: string;
  accounts?: {
    nextDue: string;
  };
  confirmationStatement?: {
    nextDue: string;
  };
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [indexErrorLink, setIndexErrorLink] = useState<string | null>(null); // To store the index creation link

  // 1. Protect the route
  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  // 2. Fetch Data Real-time
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "companies"), 
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const companyList: Company[] = [];
      snapshot.forEach((doc) => {
        companyList.push({ id: doc.id, ...doc.data() } as Company);
      });
      setCompanies(companyList);
      setIsLoadingData(false);
      setIndexErrorLink(null); // Clear error if successful
    }, (error) => {
      console.error("Error fetching companies:", error);
      setIsLoadingData(false);
      
      // Check if it's a missing index error
      if (error.message.includes("requires an index")) {
        // Extract the URL from the error message if possible
        // The error usually looks like: "The query requires an index. You can create it here: https://..."
        const match = error.message.match(/(https:\/\/console\.firebase\.google\.com[^\s]+)/);
        if (match) {
          setIndexErrorLink(match[1]);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const parseLocalDate = (dateString: string) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return "N/A";
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const getDaysRemaining = (targetDateStr: string) => {
    const due = parseLocalDate(targetDateStr);
    if (!due) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (days: number) => {
    if (days <= 7) return "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800"; 
    if (days <= 30) return "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"; 
    return "bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800"; 
  };

  const getStatusIcon = (days: number) => {
    if (days <= 7) return <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
    if (days <= 30) return <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
    return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
  };

  if (loading || (!user && loading)) {
    return <div className="flex h-screen items-center justify-center">Loading dashboard...</div>;
  }

  if (!user) return null; 

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">D</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">DueDate.UK</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-200">{user.displayName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {/* CRITICAL: Show Index Error if present */}
        {indexErrorLink && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-900">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold">Database Setup Required</h3>
              <p className="text-sm mt-1 mb-2">
                To display your companies securely, Firebase requires a "Composite Index".
              </p>
              <a 
                href={indexErrorLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:underline"
              >
                Click here to create the index automatically <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your compliance deadlines.</p>
          </div>
          <AddCompanyDialog />
        </div>

        {!isLoadingData && companies.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
            <div className="h-12 w-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <CalendarDays className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No companies tracked</h3>
            <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm mt-1 mb-4">
              You haven't added any companies yet, or the database index is still building.
            </p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => {
            const accountsDue = company.accounts?.nextDue || "";
            const stmtDue = company.confirmationStatement?.nextDue || "";
            const accountsDays = getDaysRemaining(accountsDue);
            const stmtDays = getDaysRemaining(stmtDue);

            return (
              <Card key={company.id} className="overflow-hidden hover:shadow-md transition-shadow dark:bg-slate-900 dark:border-slate-800">
                <CardHeader className="pb-3 bg-white dark:bg-slate-900 border-b dark:border-slate-800">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="font-bold text-lg">{company.companyName}</CardTitle>
                      <p className="text-xs font-mono text-slate-400 mt-1">#{company.companyNumber}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 grid gap-4">
                  <div className={`p-3 rounded-lg border ${getStatusColor(accountsDays)}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Accounts</span>
                      {getStatusIcon(accountsDays)}
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-medium">
                        {formatDateDisplay(accountsDue)}
                      </span>
                      <span className="text-xs font-bold">
                        {accountsDays < 0 ? `Overdue by ${Math.abs(accountsDays)} days` : `${accountsDays} days left`}
                      </span>
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg border ${getStatusColor(stmtDays)}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Statement</span>
                      {getStatusIcon(stmtDays)}
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-medium">
                         {formatDateDisplay(stmtDue)}
                      </span>
                      <span className="text-xs font-bold">
                         {stmtDays < 0 ? `Overdue by ${Math.abs(stmtDays)} days` : `${stmtDays} days left`}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}