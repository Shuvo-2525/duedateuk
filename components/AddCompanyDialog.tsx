"use client";

import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
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
import { Plus, Search, Loader2 } from "lucide-react";

export default function AddCompanyDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Form States
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [accountsDue, setAccountsDue] = useState("");
  const [statementDue, setStatementDue] = useState("");

  // Function to search Companies House
  const handleSearch = async () => {
    if (!number) return;
    
    setIsSearching(true);
    try {
      const res = await fetch(`/api/company/${number}`);
      const data = await res.json();

      if (res.ok) {
        setName(data.companyName);
        // Companies House returns dates like "2025-12-25", which fits our input type="date"
        if (data.accountsNextDue) setAccountsDue(data.accountsNextDue);
        if (data.confirmationStatementNextDue) setStatementDue(data.confirmationStatementNextDue);
      } else {
        alert(data.error || "Company not found");
      }
    } catch (error) {
      console.error("Search error:", error);
      alert("Failed to search company.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
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
    } catch (error) {
      console.error("Error adding company: ", error);
      alert("Failed to add company. Check console for details.");
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
      <DialogContent className="sm:max-w-[425px]">
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