'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  onSnapshot,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import withAuth from '@/components/with-auth';
import type { JournalEntry } from '@/lib/types';
import { format } from 'date-fns';
import { generateJournalPrompt } from '@/ai/flows/generate-journal-prompt';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  PlusCircle,
  Search,
  BookOpen,
  Trash2,
  FileEdit,
  Loader2,
  Sparkles,
  PenSquare,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const entrySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  tags: z.string().optional(),
});

type EntryFormValues = z.infer<typeof entrySchema>;

function JournalPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);

  const [prompt, setPrompt] = useState<string | null>(null);
  const [isPromptLoading, setIsPromptLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: { title: '', content: '', tags: '' },
  });

  // Firestore collection reference
  const journalCollectionRef = useMemo(() => {
    if (user) {
      return collection(db, 'users', user.uid, 'journals');
    }
    return null;
  }, [user]);

  // Fetch entries
  useEffect(() => {
    if (!journalCollectionRef) return;
    setIsLoading(true);
    const q = query(journalCollectionRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const entriesData = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as JournalEntry)
        );
        setEntries(entriesData);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching journal entries:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not fetch journal entries.',
        });
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [journalCollectionRef, toast]);
  
  // Filter and Search logic
  useEffect(() => {
    let result = entries;

    if (searchTerm) {
      result = result.filter(
        (entry) =>
          entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedTag) {
      result = result.filter((entry) => (entry.tags || []).includes(selectedTag));
    }

    setFilteredEntries(result);
  }, [entries, searchTerm, selectedTag]);
  
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    entries.forEach(entry => (entry.tags || []).forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [entries]);

  const handleGetPrompt = async () => {
    setIsPromptLoading(true);
    try {
        const newPrompt = await generateJournalPrompt();
        setPrompt(newPrompt);
    } catch (error) {
        console.error("Failed to get journal prompt", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not generate a new prompt. Please try again.',
        })
    } finally {
        setIsPromptLoading(false);
    }
  }

  const handleUsePrompt = () => {
    if (!prompt) return;
    setEditingEntry(null);
    form.reset({ title: prompt, content: '', tags: 'prompt' });
    setIsDialogOpen(true);
  }

  const handleFormSubmit = async (data: EntryFormValues) => {
    if (!journalCollectionRef) return;
    setIsSubmitting(true);
    
    const tagsArray = data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];

    try {
      if (editingEntry) {
        // Update existing entry
        const entryDoc = doc(db, journalCollectionRef.path, editingEntry.id);
        await updateDoc(entryDoc, { ...data, tags: tagsArray });
        toast({ title: 'Success', description: 'Journal entry updated.' });
      } else {
        // Add new entry
        await addDoc(journalCollectionRef, { ...data, tags: tagsArray, createdAt: serverTimestamp() });
        toast({ title: 'Success', description: 'Journal entry added.' });
      }
      closeDialog();
    } catch (error) {
      console.error('Error saving entry:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save the entry.',
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!journalCollectionRef) return;
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      await deleteDoc(doc(db, journalCollectionRef.path, id));
      toast({ title: 'Success', description: 'Entry deleted.' });
    } catch (error) {
      console.error('Error deleting entry:', error);
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not delete the entry.',
      });
    }
  };
  
  const openEditDialog = (entry: JournalEntry) => {
      setEditingEntry(entry);
      form.reset({
          title: entry.title,
          content: entry.content,
          tags: (entry.tags || []).join(', '),
      });
      setIsDialogOpen(true);
  };
  
  const openNewDialog = () => {
      setEditingEntry(null);
      form.reset({ title: '', content: '', tags: ''});
      setIsDialogOpen(true);
  }
  
  const closeDialog = () => {
      setIsDialogOpen(false);
      setEditingEntry(null);
      form.reset();
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Daily Journal
        </h1>
        <p className="text-muted-foreground">
          Your private space to reflect, record, and grow.
        </p>
      </header>

      {/* AI Prompt Section */}
       <Card className="mb-8 bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="text-primary" />
            AI-Powered Prompt
          </CardTitle>
          <CardDescription>
            Stuck on what to write? Get a little inspiration from our AI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPromptLoading ? (
             <Skeleton className="h-6 w-3/4" />
          ) : prompt ? (
            <p className="font-medium text-foreground">{prompt}</p>
          ) : (
             <p className="text-muted-foreground italic">Click the button to generate a new prompt.</p>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
            <Button onClick={handleGetPrompt} disabled={isPromptLoading}>
                 {isPromptLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}
                Get New Prompt
            </Button>
            {prompt && (
                <Button variant="secondary" onClick={handleUsePrompt}>
                    <PenSquare />
                    Use This Prompt
                </Button>
            )}
        </CardFooter>
      </Card>


      {/* Controls: Search, Filter, Add New */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <Input
            placeholder="Search entries..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedTag === null ? 'secondary': 'outline'}
              onClick={() => setSelectedTag(null)}
              className="rounded-full"
            >
              All
            </Button>
            {allTags.map(tag => (
                <Button 
                  key={tag} 
                  variant={selectedTag === tag ? 'secondary' : 'outline'}
                  onClick={() => setSelectedTag(tag)}
                  className="rounded-full"
                >
                  {tag}
                </Button>
            ))}
        </div>
        <Button onClick={openNewDialog} className="shrink-0">
          <PlusCircle className="mr-2" />
          New Entry
        </Button>
      </div>

      {/* Journal Entries Grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
             <Card key={i}>
                <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                </CardContent>
             </Card>
          ))}
        </div>
      ) : filteredEntries.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEntries.map((entry) => (
            <Card key={entry.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{entry.title}</CardTitle>
                <CardDescription>
                  {format( (entry.createdAt as Timestamp).toDate(), 'MMMM d, yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="line-clamp-4 text-sm text-foreground/80">
                  {entry.content}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(entry.tags || []).map((tag) => (
                    <Badge key={tag} variant="secondary" onClick={() => setSelectedTag(tag)} className="cursor-pointer">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(entry)}>
                  <FileEdit className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(entry.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
          <BookOpen className="mx-auto mb-4 size-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No Entries Found</h3>
          <p className="text-sm text-muted-foreground">
             {searchTerm || selectedTag ? "No entries match your current filters." : "Click 'New Entry' to get started."}
          </p>
        </div>
      )}
      
       {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                  <DialogTitle>{editingEntry ? 'Edit Entry' : 'New Journal Entry'}</DialogTitle>
                   <DialogDescription>
                       {editingEntry ? 'Update your journal entry.' : 'Add a new entry to your journal.'}
                  </DialogDescription>
              </DialogHeader>
               <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleFormSubmit)} className="grid gap-4 py-4">
                       <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Title</FormLabel>
                                  <FormControl><Input {...field} /></FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                       <FormField
                          control={form.control}
                          name="content"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Content</FormLabel>
                                  <FormControl><Textarea {...field} className="min-h-[150px]" /></FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                      <FormField
                          control={form.control}
                          name="tags"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Tags</FormLabel>
                                  <FormControl><Input {...field} placeholder="e.g., work, personal, idea" /></FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                       <DialogFooter>
                          <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                           <Button type="submit" disabled={isSubmitting}>
                               {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              {editingEntry ? 'Save Changes' : 'Add Entry'}
                          </Button>
                      </DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>
    </div>
  );
}

export default withAuth(JournalPage);
