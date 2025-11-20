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
import { Plus } from "lucide-react";

export default function AddCompanyDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form States
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [accountsDue, setAccountsDue] = useState("");
  const [statementDue, setStatementDue] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Add a new document with a generated id to the "companies" collection
      await addDoc(collection(db, "companies"), {
        userId: user.uid,
        companyName: name,
        companyNumber: number,
        status: "active",
        accounts: {
          nextDue: accountsDue, // format: YYYY-MM-DD
        },
        confirmationStatement: {
          nextDue: statementDue, // format: YYYY-MM-DD
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
            Enter the details manually below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="Tech Solutions Ltd"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="number" className="text-right">
              Number
            </Label>
            <Input
              id="number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="col-span-3"
              placeholder="12345678"
              required
            />
          </div>
          {/* Date Inputs - utilizing simple HTML date types for simplicity */}
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