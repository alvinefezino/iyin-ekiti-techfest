-- Replace exam_questions with the new 50 question set
-- Run this in Supabase SQL Editor. It removes the old 50 and inserts the new 50.
-- Ensure table exists (schema.sql may not have been run on this project yet — this makes the seed idempotent)
-- Prereqs for RLS policy (is_admin)
create extension if not exists pgcrypto;
create table if not exists admins (user_id uuid primary key references auth.users(id) on delete cascade);
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;
create table if not exists exam_questions (
  id int primary key,
  question text not null,
  options jsonb not null,
  answer int not null
);
-- Re-apply RLS so a fresh table is admin-only (harmless if already enabled)
alter table exam_questions enable row level security;
drop policy if exists "admin_exam_questions" on exam_questions;
create policy "admin_exam_questions" on exam_questions for all using (is_admin()) with check (is_admin());
delete from exam_questions;
insert into exam_questions (id, question, options, answer) values
(1, 'What is the primary purpose of a variable in programming?', '["To repeat a program","To store and reference data","To delete files","To compile code"]', 1),
(2, 'What is the output of this Python code? x = 5 y = 2 print(x + y * 3)', '["21","11","15","7"]', 1),
(3, 'Which Java keyword is used to create a subclass from a class?', '["implements","extends","inherits","super"]', 1),
(4, 'What does this JavaScript code return? console.log(typeof "Hello");', '["text","String","string","char"]', 2),
(5, 'Which of these is a valid Boolean value in Python?', '["\"True\"","TRUE","True","1True"]', 2),
(6, 'In C#, which keyword is commonly used to declare a constant whose value is fixed at compile time?', '["static","const","fixed","readonly"]', 1),
(7, 'What is the output of this Go code? x := 10 x += 5 fmt.Println(x)', '["10","5","15","Error"]', 2),
(8, 'Which Rust keyword declares a variable that cannot be reassigned by default?', '["var","let","mut","constvar"]', 1),
(9, 'What is the output of this Java code? int x = 10; System.out.println(x % 3);', '["3","1","0","10"]', 1),
(10, 'What does the return statement do in a function?', '["Repeats the function","Ends the function and optionally sends a value back","Deletes the function","Starts a new loop"]', 1),
(11, 'Which data structure follows the Last In First Out principle?', '["Queue","Stack","Array","Linked list"]', 1),
(12, 'What is the index of the first element in a standard Python list?', '["0","1","-1","It depends on the list size"]', 0),
(13, 'Which data structure is most suitable for processing tasks in the order they arrive?', '["Stack","Queue","Tree","Graph"]', 1),
(14, 'What is the time complexity of accessing an element by index in an array?', '["O(n)","O(log n)","O(1)","O(n²)"]', 2),
(15, 'What is the main purpose of a sorting algorithm?', '["To remove all duplicate values","To arrange elements in a specified order","To compress a file","To encrypt information"]', 1),
(16, 'Which algorithm is generally suitable for searching a sorted array efficiently?', '["Linear search","Binary search","Random search","Depth first search"]', 1),
(17, 'What is the worst case time complexity of linear search in an array of n elements?', '["O(1)","O(log n)","O(n)","O(n²)"]', 2),
(18, 'What is the output of this Python code? numbers = [2, 4, 6] numbers.append(8) print(len(numbers))', '["3","4","5","8"]', 1),
(19, 'Which data structure is commonly used to represent relationships between connected locations in a network?', '["Stack","Graph","Integer","Boolean"]', 1),
(20, 'What is the main advantage of using a hash map or dictionary?', '["It always sorts data automatically","It stores only numbers","It supports efficient key based lookup on average","It prevents all duplicate values"]', 2),
(21, 'What is encapsulation in object oriented programming?', '["Combining data and related methods while controlling access to internal state","Repeating code several times","Converting code into machine language","Running several programs simultaneously"]', 0),
(22, 'Which concept allows a class to acquire properties and methods from another class?', '["Encapsulation","Inheritance","Compilation","Iteration"]', 1),
(23, 'What is polymorphism?', '["The ability of an object or interface to support different implementations of an operation","The ability to store only one variable","The process of deleting objects","The conversion of source code into comments"]', 0),
(24, 'In Java, which keyword refers to the current object?', '["super","this","self","current"]', 1),
(25, 'What is the purpose of a constructor in a class?', '["To initialise an object when it is created","To destroy every object in a program","To repeat a loop","To compile the entire application"]', 0),
(26, 'Which statement about interfaces is generally correct?', '["They can define a contract that implementing types must satisfy","They can only store integers","They always contain a program main function","They prevent code reuse"]', 0),
(27, 'In Python, what does the self parameter conventionally represent in an instance method?', '["The parent class","The current instance","A global variable","The Python interpreter"]', 1),
(28, 'What is method overriding?', '["Defining a compatible replacement implementation of an inherited method in a subclass","Giving two variables the same value","Calling a method repeatedly","Deleting a method from memory"]', 0),
(29, 'What is the output of this JavaScript code? console.log(2 + "3");', '["5","23","NaN","An error"]', 1),
(30, 'What is the output of this Python code? for i in range(3): print(i, end=" ")', '["1 2 3","0 1 2","0 1 2 3","3 2 1"]', 1),
(31, 'In Java, which collection type stores unique elements without duplicates?', '["ArrayList","HashSet","LinkedList","StringBuilder"]', 1),
(32, 'What is the output of this C# code? int x = 4; Console.WriteLine(x * x);', '["8","12","16","4"]', 2),
(33, 'What does mut allow in Rust?', '["A variable to be modified when otherwise it would be immutable","A function to return two values automatically","A program to skip compilation","A variable to store only text"]', 0),
(34, 'In Go, which keyword declares a function?', '["func","function","def","fn"]', 0),
(35, 'What is the output of this Python code? x = [1, 2, 3] print(x[-1])', '["1","2","3","An error"]', 2),
(36, 'Which JavaScript operator checks strict equality without performing type conversion?', '["=","==","===","!="]', 2),
(37, 'In Java, what is the usual purpose of the static keyword when applied to a method?', '["It makes the method belong to the class rather than a particular instance","It prevents the method from executing","It makes the method private automatically","It converts the method into a constructor"]', 0),
(38, 'What does the Go defer statement do?', '["Schedules a function call to run when the surrounding function returns","Immediately terminates the application","Repeats the previous statement","Prevents a function from returning"]', 0),
(39, 'In C#, what is the purpose of a try catch block?', '["To repeat code","To handle exceptions","To declare a class","To sort a collection"]', 1),
(40, 'What is Rust ownership system primarily designed to help manage?', '["Variable naming conventions","Memory safety and resource management","Database table names","User interface styling"]', 1),
(41, 'What is the output of this Python code? x = 1 while x < 4: x += 1 print(x)', '["3","4","5","An infinite loop"]', 1),
(42, 'A function is supposed to return the larger of two numbers. Which implementation is correct in Python? def larger(a, b): return a if a > b else b', '["return a if a > b else b","return a + b","return a * b","return a - b"]', 0),
(43, 'Your program crashes when a user enters text instead of a number. What is the best first step?', '["Ignore the error","Validate the input and handle invalid values appropriately","Delete the input feature","Rewrite the entire application immediately"]', 1),
(44, 'What is debugging?', '["Designing a logo","Finding and fixing errors in software","Installing an operating system","Writing documentation only"]', 1),
(45, 'What is the primary purpose of version control systems such as Git?', '["To track changes to files and support collaboration","To guarantee that code has no bugs","To replace all testing","To automatically design user interfaces"]', 0),
(46, 'What is the main purpose of unit testing?', '["To test individual functions or components in isolation","To test only the internet connection","To replace all documentation","To measure the popularity of an application"]', 0),
(47, 'Two developers modify the same codebase and Git reports a merge conflict. What should they do?', '["Delete the entire repository","Resolve the conflicting changes and verify the result","Ignore the conflict and assume Git will fix everything","Uninstall Git"]', 1),
(48, 'An application works on the developer computer but fails on another computer. Which is a sensible first step?', '["Check dependencies, environment configuration, and error logs","Assume the second computer is broken","Delete the source code","Remove all tests"]', 0),
(49, 'A team is building a solution for students who struggle to find affordable accommodation. What should they do FIRST?', '["Choose a programming language","Understand the students needs and validate the problem","Build every proposed feature immediately","Design an elaborate logo"]', 1),
(50, 'A team has 24 hours to build a hackathon project. Which approach is most effective?', '["Spend the entire time discussing ideas","Build as many unfinished features as possible","Identify the core problem, build a working minimum viable product, test it, and prepare a demonstration","Focus entirely on the presentation slides"]', 2)
;
-- Verify
-- select count(*) from exam_questions; -- should be 50
insert into storage.buckets (id, name, public) values ('media','media',true) on conflict (id) do nothing;
