"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import AddCompanyDialog from "@/components/AddCompanyDialog";
import { CalendarDays, AlertCircle, CheckCircle2, ExternalLink, Trash2, Building, MapPin, Clock, Loader2 } from "lucide-react";

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
  const [indexErrorLink, setIndexErrorLink] = useState<string | null>(null);

  // States for Details Modal
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  // States for Delete Confirmation Modal
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      setIndexErrorLink(null);
    }, (error) => {
      console.error("Error fetching companies:", error);
      setIsLoadingData(false);
      
      if (error.message.includes("requires an index")) {
        const match = error.message.match(/(https:\/\/console\.firebase\.google\.com[^\s]+)/);
        if (match) {
          setIndexErrorLink(match[1]);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  // 3. Fetch Details when Modal opens
  useEffect(() => {
    if (selectedCompany) {
      const fetchDetails = async () => {
        setIsLoadingDetails(true);
        setDetailsError("");
        setCompanyDetails(null);
        
        try {
          const res = await fetch(`/api/company/${selectedCompany.companyNumber}`);
          const data = await res.json();
          
          if (!res.ok) {
            throw new Error(data.error || "Failed to fetch details");
          }
          setCompanyDetails(data);
        } catch (err: any) {
          setDetailsError(err.message);
        } finally {
          setIsLoadingDetails(false);
        }
      };
      fetchDetails();
    }
  }, [selectedCompany]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  // Open delete confirmation dialog
  const initiateDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setCompanyToDelete(id);
    setDeleteConfirmOpen(true);
  };

  // Perform the actual delete
  const confirmDelete = async () => {
    if (!companyToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "companies", companyToDelete));
      setDeleteConfirmOpen(false);
      setCompanyToDelete(null);
    } catch (error) {
      console.error("Error deleting company:", error);
      // Ideally use a toast here, but we'll log it for now
    } finally {
      setIsDeleting(false);
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
        
        {/* Index Error */}
        {indexErrorLink && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-900">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold">Database Setup Required</h3>
              <p className="text-sm mt-1 mb-2">
                To display your companies sorted by date, Firebase requires a "Composite Index".
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
              <Card 
                key={company.id} 
                className="overflow-hidden hover:shadow-md transition-all cursor-pointer group dark:bg-slate-900 dark:border-slate-800"
                onClick={() => setSelectedCompany(company)}
              >
                <CardHeader className="pb-3 bg-white dark:bg-slate-900 border-b dark:border-slate-800">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="font-bold text-lg group-hover:text-blue-600 transition-colors">{company.companyName}</CardTitle>
                      <p className="text-xs font-mono text-slate-400 mt-1">#{company.companyNumber}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 -mr-2 -mt-2"
                      onClick={(e) => initiateDelete(e, company.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
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

        {/* Company Details Modal */}
        <Dialog open={!!selectedCompany} onOpenChange={(open) => !open && setSelectedCompany(null)}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">{selectedCompany?.companyName}</DialogTitle>
              <p className="text-sm text-muted-foreground">#{selectedCompany?.companyNumber}</p>
            </DialogHeader>
            
            <div className="mt-4">
              {isLoadingDetails ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin mb-2 text-blue-600" />
                  <p>Fetching live data from Companies House...</p>
                </div>
              ) : detailsError ? (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  <p>{detailsError}</p>
                </div>
              ) : companyDetails ? (
                <div className="space-y-6">
                  
                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <div className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${
                      companyDetails.company_status === "active" 
                        ? "bg-green-100 text-green-800" 
                        : "bg-slate-100 text-slate-800"
                    }`}>
                      {companyDetails.company_status}
                    </div>
                    <span className="text-xs text-slate-500 uppercase tracking-wide border px-2 py-0.5 rounded-full">
                      {companyDetails.type}
                    </span>
                  </div>

                  {/* Address */}
                  <div className="flex gap-3 items-start">
                    <MapPin className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900">Registered Office</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {[
                          companyDetails.registered_office_address?.address_line_1,
                          companyDetails.registered_office_address?.address_line_2,
                          companyDetails.registered_office_address?.locality,
                          companyDetails.registered_office_address?.postal_code
                        ].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </div>

                  {/* Incorporation Date */}
                  <div className="flex gap-3 items-start">
                    <Building className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900">Incorporated</h4>
                      <p className="text-sm text-slate-600">
                        {companyDetails.date_of_creation ? formatDateDisplay(companyDetails.date_of_creation) : "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Deadlines Detailed View */}
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-semibold text-sm text-slate-900 mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Compliance Deadlines
                    </h4>
                    
                    <div className="grid gap-3">
                      <div className="bg-slate-50 p-3 rounded-md border">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-slate-700">Next Accounts</span>
                          <span className="text-slate-500">
                            Due: {formatDateDisplay(companyDetails.accounts?.next_due)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          Made up to: {formatDateDisplay(companyDetails.accounts?.next_made_up_to)}
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-md border">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-slate-700">Confirmation Statement</span>
                          <span className="text-slate-500">
                            Due: {formatDateDisplay(companyDetails.confirmation_statement?.next_due)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          Made up to: {formatDateDisplay(companyDetails.confirmation_statement?.next_made_up_to)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* External Link */}
                  <div className="pt-2 text-center">
                    <a 
                      href={`https://find-and-update.company-information.service.gov.uk/company/${selectedCompany?.companyNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline inline-flex items-center"
                    >
                      View on Companies House <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </div>

                </div>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Delete Company</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove this company from your dashboard? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
              <Button 
                variant="destructive" 
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}