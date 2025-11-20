"use client";

import { useState } from "react";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Loader2, AlertCircle } from "lucide-react";

export default function AddCompanyDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(""); 

  // Form States
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [accountsDue, setAccountsDue] = useState("");
  const [statementDue, setStatementDue] = useState("");

  // Function to search Companies House
  const handleSearch = async () => {
    if (!number) return;
    
    setIsSearching(true);
    setError("");
    try {
      const res = await fetch(`/api/company/${number}`);
      const data = await res.json();

      if (res.ok) {
        setName(data.companyName);
        // Update local number state to match the canonical number from API (e.g. formatted correctly)
        setNumber(data.companyNumber); 
        if (data.accountsNextDue) setAccountsDue(data.accountsNextDue);
        if (data.confirmationStatementNextDue) setStatementDue(data.confirmationStatementNextDue);
      } else {
        setError(data.error || "Company not found");
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("Failed to search. Check your internet connection.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to save.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Check for duplicates
      const q = query(
        collection(db, "companies"),
        where("userId", "==", user.uid),
        where("companyNumber", "==", number)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setError("This company has already been added to your list.");
        setLoading(false);
        return; 
      }

      // 2. Add if not duplicate
      await addDoc(collection(db, "companies"), {
        userId: user.uid,
        companyName: name,
        companyNumber: number,
        status: "active",
        accounts: {
          nextDue: accountsDue, 
        },
        confirmationStatement: {
          nextDue: statementDue,
        },
        createdAt: serverTimestamp(),
      });

      // Reset form and close dialog
      setName("");
      setNumber("");
      setAccountsDue("");
      setStatementDue("");
      setOpen(false);
    } catch (err: any) {
      console.error("Error adding company: ", err);
      
      if (err.code === "permission-denied") {
        setError("Permission denied. Check console.");
      } else {
        setError("Failed to save. Check console for details.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Company
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Company</DialogTitle>
          <DialogDescription>
            Enter the Company Number and click Search to auto-fill dates.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          
          {/* Company Number + Search Button */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="number" className="text-right">
              Number
            </Label>
            <div className="col-span-3 flex gap-2">
              <Input
                id="number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="00000000"
                required
              />
              <Button type="button" size="icon" variant="secondary" onClick={handleSearch} disabled={isSearching || !number}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Company Name */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3 bg-slate-50"
              placeholder="Auto-filled..."
              required
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="accounts" className="text-right">
              Accounts
            </Label>
            <Input
              id="accounts"
              type="date"
              value={accountsDue}
              onChange={(e) => setAccountsDue(e.target.value)}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="statement" className="text-right">
              Statement
            </Label>
            <Input
              id="statement"
              type="date"
              value={statementDue}
              onChange={(e) => setStatementDue(e.target.value)}
              className="col-span-3"
              required
            />
          </div>

          {/* Error Message Section - FIXED UI */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Company"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}