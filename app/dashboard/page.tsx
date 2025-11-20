"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { collection, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AddCompanyDialog from "@/components/AddCompanyDialog";
import { CalendarDays, AlertCircle, CheckCircle2 } from "lucide-react";

// Define the shape of a Company object based on our Firestore schema
interface Company {
  id: string;
  companyName: string;
  companyNumber: string;
  accounts: {
    nextDue: string;
  };
  confirmationStatement: {
    nextDue: string;
  };
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // 1. Protect the route
  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  // 2. Fetch Data Real-time
  useEffect(() => {
    if (!user) return;

    // Query: Get companies where userId matches current user, order by newest first
    // Note: You might need to create an index in Firebase console for this specific query later.
    // If it fails, check the browser console for a link to create the index.
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
    }, (error) => {
      console.error("Error fetching companies:", error);
      setIsLoadingData(false);
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

  // Utility to calculate days remaining
  const getDaysRemaining = (targetDate: string) => {
    if (!targetDate) return 0;
    const due = new Date(targetDate);
    const today = new Date();
    // Reset hours to compare just dates
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Utility to determine status color
  const getStatusColor = (days: number) => {
    if (days <= 7) return "bg-red-100 text-red-800 border-red-200"; // Critical
    if (days <= 30) return "bg-amber-100 text-amber-800 border-amber-200"; // Warning
    return "bg-green-100 text-green-800 border-green-200"; // Safe
  };

  const getStatusIcon = (days: number) => {
    if (days <= 7) return <AlertCircle className="h-4 w-4 text-red-600" />;
    if (days <= 30) return <AlertCircle className="h-4 w-4 text-amber-600" />;
    return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  };

  if (loading || (!user && loading)) {
    return <div className="flex h-screen items-center justify-center">Loading dashboard...</div>;
  }

  // Safe guard if user is null but loading finished (useEffect will redirect, but render needs to be safe)
  if (!user) return null; 

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">D</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800">DueDate.UK</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-900">{user.displayName}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h2>
            <p className="text-slate-500 mt-1">Manage your compliance deadlines.</p>
          </div>
          <AddCompanyDialog />
        </div>

        {/* Empty State */}
        {!isLoadingData && companies.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <CalendarDays className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No companies tracked</h3>
            <p className="text-slate-500 text-center max-w-sm mt-1 mb-4">
              You haven't added any companies yet. Click the button above to start tracking deadlines.
            </p>
          </div>
        )}

        {/* Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => {
            const accountsDays = getDaysRemaining(company.accounts.nextDue);
            const stmtDays = getDaysRemaining(company.confirmationStatement.nextDue);

            return (
              <Card key={company.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 bg-white border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="font-bold text-lg">{company.companyName}</CardTitle>
                      <p className="text-xs font-mono text-slate-400 mt-1">#{company.companyNumber}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 grid gap-4">
                  {/* Accounts Row */}
                  <div className={`p-3 rounded-lg border ${getStatusColor(accountsDays)}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Accounts</span>
                      {getStatusIcon(accountsDays)}
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-medium">
                        {new Date(company.accounts.nextDue).toLocaleDateString('en-GB')}
                      </span>
                      <span className="text-xs font-bold">
                        {accountsDays < 0 ? `Overdue by ${Math.abs(accountsDays)} days` : `${accountsDays} days left`}
                      </span>
                    </div>
                  </div>

                  {/* Statement Row */}
                  <div className={`p-3 rounded-lg border ${getStatusColor(stmtDays)}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Statement</span>
                      {getStatusIcon(stmtDays)}
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-medium">
                        {new Date(company.confirmationStatement.nextDue).toLocaleDateString('en-GB')}
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