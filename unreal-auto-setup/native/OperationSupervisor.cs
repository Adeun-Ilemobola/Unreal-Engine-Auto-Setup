// Windows-only, .NET Framework 4.x. Build with tools/phase3b2b/build-helper.ps1.
// The job handle is private and never inherited. No PID-based termination API.
using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Collections.Generic;
using System.Web.Script.Serialization;

class OperationSupervisor {
 [StructLayout(LayoutKind.Sequential)] struct SA { public int length; public IntPtr descriptor; public int inherit; }
 [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct SI {
  public int cb; public string reserved,desktop,title; public int x,y,w,h,cx,cy,fill,flags;
  public short show,reserved2; public IntPtr reservedPtr,input,output,error;
 }
 [StructLayout(LayoutKind.Sequential)] struct PI { public IntPtr process,thread; public uint pid,tid; }
 [StructLayout(LayoutKind.Sequential)] struct BASIC {
  public long processTime,jobTime; public uint flags; public UIntPtr min,max; public uint active; public UIntPtr affinity; public uint priority,scheduling;
 }
 [StructLayout(LayoutKind.Sequential)] struct IO { public ulong a,b,c,d,e,f; }
 [StructLayout(LayoutKind.Sequential)] struct EXT { public BASIC basic; public IO io; public UIntPtr processMemory,jobMemory,peakProcess,peakJob; }
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateJobObject(IntPtr sa,string name);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job,int type,ref EXT value,uint size);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool QueryInformationJobObject(IntPtr job,int type,byte[] value,uint size,IntPtr returned);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr job,IntPtr process);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool TerminateJobObject(IntPtr job,uint code);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool TerminateProcess(IntPtr process,uint code);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateProcess(string app,StringBuilder command,IntPtr pa,IntPtr ta,bool inherit,uint flags,IntPtr env,string cwd,ref SI si,out PI pi);
 [DllImport("kernel32.dll",SetLastError=true)] static extern uint ResumeThread(IntPtr thread);
 [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr handle,uint ms);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetExitCodeProcess(IntPtr process,out uint code);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateFile(string file,uint access,uint share,ref SA sa,uint mode,uint flags,IntPtr template);
 static JavaScriptSerializer json=new JavaScriptSerializer();
 static string Digest(byte[] data) { using(var sha=SHA256.Create()) return BitConverter.ToString(sha.ComputeHash(data)).Replace("-","").ToLowerInvariant(); }
 static void Check(bool ok) { if(!ok) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error()); }
 static Dictionary<string,object> Read(string file) {
  var info=new FileInfo(file); if(info.Length>32768 || (info.Attributes&FileAttributes.ReparsePoint)!=0) throw new Exception("Invalid journal file");
  return json.Deserialize<Dictionary<string,object>>(File.ReadAllText(file));
 }
 static void Write(string file,object data) {
  var temp=file+".partial"; var bytes=Encoding.UTF8.GetBytes(json.Serialize(data));
  using(var stream=new FileStream(temp,FileMode.CreateNew,FileAccess.Write,FileShare.Read)) {stream.Write(bytes,0,bytes.Length);stream.Flush(true);}
  File.Move(temp,file);
 }
 static IntPtr Output(string file,ref SA sa,uint access) {
  var h=CreateFile(file,access,3,ref sa,file=="NUL"?3u:1u,0,IntPtr.Zero);
  if(h==new IntPtr(-1)) throw new System.ComponentModel.Win32Exception(); return h;
 }
 static int Main(string[] args) {
  IntPtr job=IntPtr.Zero,stdout=IntPtr.Zero,stderr=IntPtr.Zero,stdin=IntPtr.Zero; PI pi=new PI(); bool resumed=false;
  string directory=null;string stage="validate";
  try {
   if(args.Length<1 || args.Length>2 || (args.Length==2 && args[1]!="--worker")) throw new Exception("Expected operation directory and optional worker mode");
   directory=Path.GetFullPath(args[0]);
   if((File.GetAttributes(directory)&FileAttributes.ReparsePoint)!=0) throw new Exception("Linked operation directory");
   var intent=Read(Path.Combine(directory,"intent.json"));var plan=Read(Path.Combine(directory,"supervision.json"));
   var id=(string)intent["operationId"]; Guid parsed;
   if(!Guid.TryParse(id,out parsed) || (int)intent["schema"]!=1 || (int)plan["schema"]!=1 || (string)plan["operationId"]!=id || (string)plan["project"]!=(string)intent["project"]) throw new Exception("Operation mismatch");
   var exe=Process.GetCurrentProcess().MainModule.FileName;
   var helperHash=Digest(File.ReadAllBytes(exe));if(helperHash!=(string)plan["helperHash"]) throw new Exception("Helper identity mismatch");
   var encoded=(string)plan["encoded"];
   var spawn=Read(Path.Combine(directory,"spawn.json"));
   if((string)spawn["operationId"]!=id || (string)spawn["commandHash"]!=(string)plan["commandHash"])throw new Exception("Spawn intent mismatch");
   if(encoded.Length>24000 || Digest(Encoding.UTF8.GetBytes(encoded))!=(string)plan["commandHash"]) throw new Exception("Command mismatch");
   // Validate the encoded script's operation tag before creating any process.
   if(!Encoding.Unicode.GetString(Convert.FromBase64String(encoded)).StartsWith("# Operation "+id+"\n")) throw new Exception("Missing operation tag");
   if(args.Length==1) {
    // The VS Code host may itself be job-contained. A worker inheriting that job
    // is not independent of host teardown. Refuse launch if Windows denies escape.
    var boot=new SI{cb=Marshal.SizeOf(typeof(SI))};PI worker;
    stage="start independent supervisor";
    Check(CreateProcess(exe,new StringBuilder("\""+exe+"\" \""+directory+"\" --worker"),IntPtr.Zero,IntPtr.Zero,false,0x09000200,IntPtr.Zero,directory,ref boot,out worker));
    CloseHandle(worker.thread);CloseHandle(worker.process);
    Write(Path.Combine(directory,"supervisor-bootstrap.json"),new {schema=1,operationId=id,pid=worker.pid,breakawayRequested=true});
    return 0;
   }
   stage="create job";job=CreateJobObject(IntPtr.Zero,null);Check(job!=IntPtr.Zero);
   var limits=new EXT();limits.basic.flags=0x2000; // KILL_ON_JOB_CLOSE; neither breakaway flag.
   Check(SetInformationJobObject(job,9,ref limits,(uint)Marshal.SizeOf(typeof(EXT))));
   var sa=new SA{length=Marshal.SizeOf(typeof(SA)),inherit=1};
   stdout=Output(Path.Combine(directory,"stdout.log"),ref sa,0x40000000);stderr=Output(Path.Combine(directory,"stderr.log"),ref sa,0x40000000);stdin=Output("NUL",ref sa,0x80000000);
   var si=new SI{cb=Marshal.SizeOf(typeof(SI)),flags=0x100,input=stdin,output=stdout,error=stderr};
   var shell=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System),"WindowsPowerShell","v1.0","powershell.exe");
   stage="create suspended root";Check(CreateProcess(shell,new StringBuilder("\""+shell+"\" -NoLogo -NoProfile -EncodedCommand "+encoded),IntPtr.Zero,IntPtr.Zero,true,0x08000004,IntPtr.Zero,Path.GetDirectoryName((string)intent["project"]),ref si,out pi));
   // No target instructions have executed yet. A failed assignment never resumes it.
   stage="assign root";Check(AssignProcessToJobObject(job,pi.process));
   Write(Path.Combine(directory,"supervisor-started.json"),new {schema=1,operationId=id,project=intent["project"],helperHash=helperHash,commandHash=plan["commandHash"],pid=Process.GetCurrentProcess().Id,creation=Process.GetCurrentProcess().StartTime.ToUniversalTime().ToString("o"),rootPid=pi.pid,assignedBeforeResume=true});
   stage="resume root";if(ResumeThread(pi.thread)==0xffffffff) throw new System.ComponentModel.Win32Exception();resumed=true;
   CloseHandle(pi.thread);pi.thread=IntPtr.Zero;
   bool rootExited=false,cancelled=false;uint exitCode=0;var accounting=new byte[48];stage="monitor job";
   for(;;) {
    var cancelFile=Path.Combine(directory,"cancel.json");
    if(!cancelled && File.Exists(cancelFile)) {
     var request=Read(cancelFile);
     if((string)request["operationId"]!=id || (string)request["commandHash"]!=(string)plan["commandHash"]) throw new Exception("Invalid cancellation identity");
     Check(TerminateJobObject(job,1223));cancelled=true;
     Write(Path.Combine(directory,"cancel-accepted.json"),new {schema=1,operationId=id});
    }
    if(!rootExited && WaitForSingleObject(pi.process,0)==0) {
     Check(GetExitCodeProcess(pi.process,out exitCode));rootExited=true;
     Write(Path.Combine(directory,"supervisor-root-exit.json"),new {schema=1,operationId=id,exitCode=exitCode});
    }
    Check(QueryInformationJobObject(job,1,accounting,48,IntPtr.Zero));
    uint active=BitConverter.ToUInt32(accounting,40);
    if(rootExited && active==0) {
     CloseHandle(stdout);stdout=IntPtr.Zero;CloseHandle(stderr);stderr=IntPtr.Zero;
     Write(Path.Combine(directory,"tree-complete.json"),new {schema=1,operationId=id,project=intent["project"],helperHash=helperHash,commandHash=plan["commandHash"],activeProcesses=0,rootExited=true,exitCode=exitCode,cancelled=cancelled,containment="windows-job-v1"});
     return 0;
    }
    if(new FileInfo(Path.Combine(directory,"stdout.log")).Length+new FileInfo(Path.Combine(directory,"stderr.log")).Length>64*1024*1024) throw new Exception("Operation output limit exceeded");
    Thread.Sleep(50); // Private job query, never a system process scanner.
   }
  } catch(Exception error) {
   // Exact process handle only: suspended roots cannot spawn descendants before assignment.
   if(pi.process!=IntPtr.Zero && !resumed) {TerminateProcess(pi.process,1);WaitForSingleObject(pi.process,5000);}
   try {if(directory!=null) Write(Path.Combine(directory,"supervisor-failed.json"),new {schema=1,error=stage+": "+error.Message});} catch {}
   return 1;
  } finally {
   if(job!=IntPtr.Zero)CloseHandle(job); // On supervisor loss the kernel kills this contained job.
   if(pi.process!=IntPtr.Zero)CloseHandle(pi.process);if(pi.thread!=IntPtr.Zero)CloseHandle(pi.thread);
   if(stdout!=IntPtr.Zero)CloseHandle(stdout);if(stderr!=IntPtr.Zero)CloseHandle(stderr);if(stdin!=IntPtr.Zero)CloseHandle(stdin);
  }
 }
}
