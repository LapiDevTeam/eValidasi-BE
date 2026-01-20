Option Explicit

'#postgres
Private Declare Function ShellExecute Lib "shell32.dll" Alias "ShellExecuteA" ( _
    ByVal hwnd As Long, _
    ByVal lpOperation As String, _
    ByVal lpFile As String, _
    ByVal lpParameters As String, _
    ByVal lpDirectory As String, _
    ByVal nShowCmd As Long) As Long



Private Declare Function GetComputerName Lib "KERNEL32" Alias "GetComputerNameA" (ByVal lpBuffer As String, nSize As Long) As Long
Declare Function FindWindow Lib "user32" Alias "FindWindowA" (ByVal lpClassName As String, ByVal lpWindowName As String) As Long
Declare Function ShowWindow Lib "user32" (ByVal hwnd As Long, ByVal nCmdShow As Long) As Long
Declare Function SendMessage Lib "user32" Alias "SendMessageA" (ByVal hwnd As Long, ByVal wMsg As Long, ByVal wParam As Long, lParam As Any) As Long
Declare Function BringWindowToTop Lib "user32" (ByVal hwnd As Long) As Long
'Private Declare Function IsWindow Lib "user32" (ByVal hWnd As Long) As Long

'''
Private Declare Function OpenProcess Lib "KERNEL32" ( _
    ByVal dwDesiredAccess As Long, ByVal bInheritHandle As Long, ByVal dwProcessId As Long) As Long

Private Declare Function CloseHandle Lib "KERNEL32" ( _
    ByVal hObject As Long) As Long

Private Declare Function EnumProcesses Lib "PSAPI.DLL" ( _
   lpidProcess As Long, ByVal cb As Long, cbNeeded As Long) As Long

Private Declare Function EnumProcessModules Lib "PSAPI.DLL" ( _
    ByVal hProcess As Long, lphModule As Long, ByVal cb As Long, lpcbNeeded As Long) As Long

Private Declare Function GetModuleBaseName Lib "PSAPI.DLL" Alias "GetModuleBaseNameA" ( _
    ByVal hProcess As Long, ByVal hModule As Long, ByVal lpFileName As String, ByVal nSize As Long) As Long

Private Const PROCESS_VM_READ = &H10
Private Const PROCESS_QUERY_INFORMATION = &H400
'''

Private Declare Function GetModuleFileName Lib "KERNEL32" _
Alias "GetModuleFileNameA" _
(ByVal hModule As Long, _
ByVal lpFileName As String, _
ByVal nSize As Long) As Long


Declare Function apiShowWindow Lib "user32" Alias "ShowWindow" _
            (ByVal hwnd As Long, ByVal nCmdShow As Long) As Long

Global Const SW_MAXIMIZE = 3
Global Const SW_SHOWNORMAL = 1
Global Const SW_SHOWMINIMIZED = 2

' Return path of the Windows directory93

'Used for findAndCloseWindow function
Const NILL = 0&
Const WM_SYSCOMMAND = &H112
Const SC_CLOSE = &HF060&
'End Used

Dim lHwnd As Long

'initialize program info, data ini harus sesuai dengan m_mainmenu di lapifactory
Public Const ProgramName = "IT System"
Public Const ProgramVersion = "1"
Public Const ProgramVersionDate = "2019-10-11 09:57:38"
Public Const gstrFilename = "IT01.exe"
'end

Public Const SQL_Delimiter = "%%%###$$$"
Public Const Default_Message_Title = "LAPI"
'Public Const BatchChangePeriode = "2010-05-30" 'aturan batch baru berlaku untuk yang manuf date nya sesudah batchchangeperiode

Public Const gstrDB_lapiSerial2D = "LAPIserial2D"

Public gvarBackGroundColor As Variant
Public gstrUserName As String
Public gstrEmployeeName As String
Public gstrTahunBulan As String
Public gdtmPeriod As Date
Public gstrDelegatedTo As String
Public gblnReadOnly As String
Public gstrPassword As String
'
Public gstrTahunBudget As String
Public gstrDepartment As String

Public gstrDbaseName As String
Public gstrDbaseName2 As String
Public gstrDataSource As String
Public gstrDataSource2 As String
Public gobjConn As New ADODB.Connection
Public gobjConn2 As New ADODB.Connection
Public gobjConnStart As New ADODB.Connection
Public gstrADODC_Conn As String
Public gstrADODC_Conn2 As String
Public gStrListerTag As String
Public grecLister As ADODB.Recordset
Public gstrCurrentNo As String
Public gstrPathExe As String
Public gstrUserSA As String
Public gstrPasswordSA As String
Public gstrUserSA2 As String
Public gstrPasswordSA2 As String
Public gstrParameter As String
Public gstrWithoutLogin As String

Public sPOHeader As String
Public sNomorPO As String

Public menuToken As String
Public gStrSystem As String
Public gStrWebServer As String


Public Sub setMenuName(ByVal Dept As String, ByVal O As Object, ByVal eSystem As String)
    On Error GoTo Err
    Dim rs As ADODB.Recordset
    Dim strTemp As String

    strTemp = " select menu_name, submenu_name, submenu_description, isnull(submenu_progname,'') as submenu_progname from m_MainMenu a join m_mainmenu_detail b on a.pk_id=b.menu_id where a.menu_isactive = 1 and b.menu_dept='" & Dept & "' and submenu_isactive=1 and submenu_type in ('Master','Transaction','Report') order by isnull(submenu_progname,'')"
    'strTemp = strTemp & " and menu_name = '" & eSystem & "'"
    Debug.Print strTemp
    Set rs = GetRecordset(strTemp)

    With rs
        .MoveFirst
            Do While Not .EOF
                O.Controls(rs!submenu_name).Caption = rs!submenu_description

                'If rs!menu_name = eSystem Then
                '    O.Controls(rs!submenu_name).Visible = True
                'Else
                'If rs!submenu_progname <> "" Then

                    O.Controls(rs!submenu_name).Visible = False

                'End If
                'End If
            .MoveNext
        Loop
    End With

    Exit Sub
Err:
Resume Next
'MsgBox ("Error Menu, Mohon hubungi IT.")
End Sub

Public Sub setMenuVisible(ByVal Dept As String, ByVal O As Object, ByVal eSystem As String)
    On Error GoTo Err
    Dim rs As ADODB.Recordset
    Dim strTemp As String

    strTemp = " select a.menu_name, submenu_name, submenu_description from m_MainMenu a join m_mainmenu_detail b on a.pk_id=b.menu_id where a.menu_isactive = 1 and b.menu_dept='" & Dept & "' and submenu_isactive=1 and submenu_type in ('Master','Transaction','Report')"
    'strTemp = strTemp & " and b.submenu_progname is not null"
    strTemp = strTemp & " and a.menu_name = '" & gStrSystem & "'"

    Set rs = GetRecordset(strTemp)

    With rs
        .MoveFirst
            Do While Not .EOF

                'If rs!menu_name = eSystem Then
                O.Controls(rs!submenu_name).Visible = True
                'End If


            .MoveNext
        Loop
    End With

    Exit Sub
Err:
Resume Next
'MsgBox ("Error Menu, Mohon hubungi IT.")
End Sub

Public Sub accessRightsMenu(ByVal Dept As String, ByVal O As Object)
On Error GoTo Err
    Dim rs As ADODB.Recordset
    Dim strTemp As String
    strTemp = " select submenu_name, submenu_progname from m_MainMenu a join m_mainmenu_detail b on a.pk_id=b.menu_id where b.menu_dept='" & Dept & "' and submenu_isactive=1 and submenu_progname is not null and submenu_deptaccess like '%" & gstrDepartment & "%' and submenu_type in ('Master','Transaction','Report') and a.menu_name = '" & gStrSystem & "'"

    Set rs = GetRecordset(strTemp)

    With rs
    If rs.RecordCount > 0 Then
        .MoveFirst
            Do While Not .EOF
                If User_Access_All(gstrUserName) = True Then
                    O.Controls(rs!submenu_name).Enabled = True
                Else

                    O.Controls(rs!submenu_name).Enabled = User_Access(rs!submenu_progname)
                End If
            .MoveNext
        Loop
    End If
    End With
    Exit Sub
Err:
Resume Next
'MsgBox ("Error Menu, Mohon hubungi IT.")
End Sub

Public Sub disableMenu(ByVal Dept As String, ByVal O As Object)
 On Error GoTo Err
 Dim rs As ADODB.Recordset
    Dim strTemp As String

    If User_Access_All(gstrUserName) = True Then Exit Sub


    strTemp = " select submenu_name, submenu_isactive from m_MainMenu a join m_mainmenu_detail b on a.pk_id=b.menu_id where b.menu_dept='" & Dept & "' and submenu_progname is not null and submenu_type in ('Master','Transaction','Report') and a.menu_name = '" & gStrSystem & "'"
    Set rs = GetRecordset(strTemp)

    'Debug.Print strTemp

    Dim tmp_a As String
If rs.RecordCount > 0 Then

    With rs
        .MoveFirst
            Do While Not .EOF
            If (rs!submenu_isactive = 0) Then
                O.Controls(rs!submenu_name).Visible = False
            Else

                O.Controls(rs!submenu_name).Enabled = False
            End If

            .MoveNext
        Loop
    End With


  End If
  Exit Sub
Err:
Resume Next
'MsgBox ("Error Menu, Mohon hubungi IT.")
End Sub
Public Sub getMenuFormPHP(ByVal menu_name As String, ByVal submenu_name As String, ByVal UserID As String, ByVal delegated As String, ByVal password As String)
Dim strSQL As String
Dim rec As ADODB.Recordset


        strSQL = " select submenu_name, menu_url, menu_loginPage, menu_txtLogin, menu_txtPassword, menu_ddlDelegatedTo, "
        strSQL = strSQL & " menu_btnLOgin, submenu_page, menu_parent_id from m_mainmenu_detail a join m_mainmenu b on"
        strSQL = strSQL & " a.menu_id = b.pk_id"
        strSQL = strSQL & " where b.menu_name='" & menu_name & "'"
        strSQL = strSQL & " and submenu_name='" & submenu_name & "'"

        Set rec = New ADODB.Recordset
        Set rec = GetRecordset(strSQL)
        'Set getMenuForm = rec

        Dim app As String
        Dim loginPage As String
        Dim menuPage As String
        Dim lblUserName As String
        Dim lblPassword As String
        Dim lblDelegatedTo As String
        Dim lblBtnLogin As String

    'Set rec = getMenuForm("QA System", "Create New PPK")
        If Not rec.EOF Then
            app = Trim(rec!menu_url)
            loginPage = Trim(rec!menu_loginPage)
            loginPage = Replace(loginPage, "[UserID]", delegated)
            loginPage = Replace(loginPage, "[DelegatedTo]", UserID)
            loginPage = Replace(loginPage, "[Token]", getToken(delegated))

            'lblUserName = Trim(rec!menu_txtLogin)
            'lblPassword = Trim(rec!menu_txtPassword)
            'lblDelegatedTo = Trim(rec!menu_ddlDelegatedTo)
            'lblBtnLogin = Trim(rec!menu_btnLOgin)
            menuPage = Trim(rec!submenu_page)
            gStrWebServer = "" & rec!Menu_parent_id
        Else
            MsgBox ("menu tidak ditemukan")
            Exit Sub
        End If


'        Dim objShell, objExec As Object
'        Set objShell = CreateObject("WScript.Shell")
'        Set objExec = objShell.Exec("C:\Program Files\Google\Chrome\Application\chrome.exe http://192.168.1.159:8081/HRIS/" & loginPage & "?page=" & menuPage)
'
        Shell "cmd /c start chrome http://" & gStrWebServer & ":8082/HRIS/" & loginPage & "?page=" & menuPage, vbMaximizedFocus


End Sub

Public Sub getMenuFormPHP8082(ByVal menu_name As String, ByVal submenu_name As String, ByVal UserID As String, ByVal delegated As String, ByVal password As String)
Dim strSQL As String
Dim rec As ADODB.Recordset


        strSQL = " select submenu_name, menu_url, menu_loginPage, menu_txtLogin, menu_txtPassword, menu_ddlDelegatedTo, "
        strSQL = strSQL & " menu_btnLOgin, submenu_page, menu_parent_id from m_mainmenu_detail a join m_mainmenu b on"
        strSQL = strSQL & " a.menu_id = b.pk_id"
        strSQL = strSQL & " where b.menu_name='" & menu_name & "'"
        strSQL = strSQL & " and submenu_name='" & submenu_name & "'"

        Set rec = New ADODB.Recordset
        Set rec = GetRecordset(strSQL)
        'Set getMenuForm = rec

        Dim app As String
        Dim loginPage As String
        Dim menuPage As String
        Dim lblUserName As String
        Dim lblPassword As String
        Dim lblDelegatedTo As String
        Dim lblBtnLogin As String

    'Set rec = getMenuForm("QA System", "Create New PPK")
        If Not rec.EOF Then
            app = Trim(rec!menu_url)
            loginPage = Trim(rec!menu_loginPage)
            loginPage = Replace(loginPage, "[UserID]", delegated)
            loginPage = Replace(loginPage, "[DelegatedTo]", UserID)
            loginPage = Replace(loginPage, "[Token]", getToken(delegated))

            'lblUserName = Trim(rec!menu_txtLogin)
            'lblPassword = Trim(rec!menu_txtPassword)
            'lblDelegatedTo = Trim(rec!menu_ddlDelegatedTo)
            'lblBtnLogin = Trim(rec!menu_btnLOgin)
            menuPage = Trim(rec!submenu_page)
            gStrWebServer = "" & rec!Menu_parent_id
        Else
            MsgBox ("menu tidak ditemukan")
            Exit Sub
        End If


'        Dim objShell, objExec As Object
'        Set objShell = CreateObject("WScript.Shell")
'        Set objExec = objShell.Exec("C:\Program Files\Google\Chrome\Application\chrome.exe http://192.168.1.159:8082/" & app & "/" & loginPage & "?page=" & menuPage)


        Shell "cmd /c start chrome http://" & gStrWebServer & ":8082/" & app & "/" & loginPage & "?page=" & menuPage, vbMaximizedFocus



End Sub
Public Sub getMenuFormPHPPL(ByVal menu_name As String, ByVal submenu_name As String, ByVal UserID As String, ByVal delegated As String, ByVal password As String, ByVal menuPage As String)


        Dim app As String
        Dim loginPage As String
       ' Dim menuPage As String
        Dim lblUserName As String
        Dim lblPassword As String
        Dim lblDelegatedTo As String
        Dim lblBtnLogin As String


            app = "Obat-ecer"
            loginPage = "index.php/sign_in/doSignInVB/[UserID]/[DelegatedTo]/[Token]"
            loginPage = Replace(loginPage, "[UserID]", delegated)
            loginPage = Replace(loginPage, "[DelegatedTo]", UserID)
            loginPage = Replace(loginPage, "[Token]", getToken(delegated))
            'gStrWebServer = "web.lapilabs.co.id"
            'gwn krn web lama ga bisa akses php 20250211
            gStrWebServer = "192.168.1.39"

'        Dim objShell, objExec As Object
'        Set objShell = CreateObject("WScript.Shell")
'        Set objExec = objShell.Exec("C:\Program Files\Google\Chrome\Application\chrome.exe http://192.168.1.159:8082/" & app & "/" & loginPage & "?page=" & menuPage)

        Shell "cmd /c start chrome http://" & gStrWebServer & ":8082/" & app & "/" & loginPage & "?page=" & menuPage, vbMaximizedFocus

End Sub

Public Sub getMenuFormRFID(ByVal menu_name As String, ByVal submenu_name As String, ByVal UserID As String, ByVal delegated As String, ByVal password As String)
Dim strSQL As String
Dim rec As ADODB.Recordset


        strSQL = " select submenu_name, menu_url, menu_loginPage, menu_txtLogin, menu_txtPassword, menu_ddlDelegatedTo, "
        strSQL = strSQL & " menu_btnLOgin, submenu_page, menu_parent_id from m_mainmenu_detail a join m_mainmenu b on"
        strSQL = strSQL & " a.menu_id = b.pk_id"
        strSQL = strSQL & " where b.menu_name='" & menu_name & "'"
        strSQL = strSQL & " and submenu_name='" & submenu_name & "'"

        Set rec = New ADODB.Recordset
        Set rec = GetRecordset(strSQL)
        'Set getMenuForm = rec

        Dim app As String
        Dim loginPage As String
        Dim menuPage As String
        Dim lblUserName As String
        Dim lblPassword As String
        Dim lblDelegatedTo As String
        Dim lblBtnLogin As String
        Dim a As String

    'Set rec = getMenuForm("QA System", "Create New PPK")
        If Not rec.EOF Then
            app = Trim(rec!menu_url)
            loginPage = Trim(rec!menu_loginPage)
            loginPage = Replace(loginPage, "[UserID]", delegated)
            loginPage = Replace(loginPage, "[DelegatedTo]", UserID)
            loginPage = Replace(loginPage, "[Token]", getToken(delegated))

            'lblUserName = Trim(rec!menu_txtLogin)
            'lblPassword = Trim(rec!menu_txtPassword)
            'lblDelegatedTo = Trim(rec!menu_ddlDelegatedTo)
            'lblBtnLogin = Trim(rec!menu_btnLOgin)
            menuPage = Trim(rec!submenu_page)
            gStrWebServer = "" & rec!Menu_parent_id
        Else
            MsgBox ("menu tidak ditemukan")
            Exit Sub
        End If


'        Dim objShell, objExec As Object
'        Set objShell = CreateObject("WScript.Shell")
'        Set objExec = objShell.Exec("C:\Program Files\Google\Chrome\Application\chrome.exe http://192.168.1.159:8081/HRIS/" & loginPage & "?page=" & menuPage)
'
        a = "cmd /c start chrome" & " ""http://" & gStrWebServer & ":8080/eMon/" & loginPage & "&page=" & menuPage
        ' khusus chrome dengan java hasil jadi sebelum di shell harus seperti ini :
        ' cmd /c start chrome "http://web.lapilabs.co.id:8080/eMon/AutoLoginVb.aspx?UID=493&&DID=493&&TOKEN=4315da3dee6a488dea727f1c65600bbb&page=/emon/prod_list_produksi.aspx
        Shell a, vbMaximizedFocus
End Sub

Function getToken(ByVal user_id As String) As String

Dim strSQL As String
Dim rec As ADODB.Recordset

        strSQL = "select dbo.[fnGetToken]('" & user_id & "') as token"
        'strSQL = " select menu_token from m_mainmenu where menu_name='" & ProgramName & "' and menu_version='" & ProgramVersion & "' and convert(varchar(255),menu_version_date,120)='" & token & "'"
        Set rec = New ADODB.Recordset

        Set rec = GetRecordset(strSQL)
        If Not rec.EOF Then
            getToken = Trim(rec!token)
        Else
            getToken = ""
        End If
        If rec.State = adStateOpen Then rec.Close
        Set rec = Nothing

End Function

Public Sub getMenuForm(ByVal menu_name As String, ByVal submenu_name As String, ByVal UserID As String, ByVal delegated As String, ByVal password As String)  'As ADODB.Recordset

Dim strSQL As String
Dim rec As ADODB.Recordset


        strSQL = " select submenu_name, menu_url, menu_loginPage, menu_txtLogin, menu_txtPassword, menu_ddlDelegatedTo, "
        strSQL = strSQL & " menu_btnLOgin, submenu_page, menu_esystem, menu_parent_id from m_mainmenu_detail a join m_mainmenu b on"
        strSQL = strSQL & " a.menu_id = b.pk_id"
        strSQL = strSQL & " where b.menu_name='" & menu_name & "'"
        strSQL = strSQL & " and submenu_name='" & submenu_name & "'"

        Debug.Print strSQL
        Set rec = New ADODB.Recordset
        Set rec = GetRecordset(strSQL)
        'Set getMenuForm = rec


        Dim app As String
        Dim loginPage As String
        Dim menuPage As String
        Dim lblUserName As String
        Dim lblPassword As String
        Dim lblDelegatedTo As String
        Dim lblBtnLogin As String
        Dim lblesystem As String

    'Set rec = getMenuForm("QA System", "Create New PPK")
        If Not rec.EOF Then
            app = Trim(rec!menu_url)
            loginPage = Trim(rec!menu_loginPage)
            lblUserName = Trim(rec!menu_txtLogin)
            lblPassword = Trim(rec!menu_txtPassword)
            lblDelegatedTo = Trim(rec!menu_ddlDelegatedTo)
            lblBtnLogin = Trim(rec!menu_btnLOgin)
            lblesystem = Trim("" & rec!menu_esystem)
            menuPage = Trim(rec!submenu_page)
            gStrWebServer = "" & rec!Menu_parent_id
        Else
            MsgBox ("menu tidak ditemukan")
            Exit Sub
        End If


        Dim ie  As Object
        Set ie = CreateObject("InternetExplorer.Application")

       ' apiShowWindow ie.hwnd, SW_MAXIMIZE

        ie.Visible = True
        ie.Navigate "http://" & gStrWebServer & ":8080/"
        Do While ie.Busy Or ie.readyState <> 4
            DoEvents
        Loop
        ie.Navigate "http://" & gStrWebServer & ":8080/" & app & "/" & loginPage
        Do While ie.Busy Or ie.readyState <> 4
            DoEvents
        Loop

        '~~> Get the ID of the textbox where you want to output
        ie.Document.GetElementById(lblUserName).value = delegated
'
        ie.Document.GetElementById(lblPassword).value = password
        ie.Document.GetElementById(lblDelegatedTo).value = UserID
        If (lblesystem <> "") Then
            ie.Document.GetElementById(lblesystem).value = gStrSystem
        End If


        'MsgBox (ie.Document.GetElementById(lblUserName).Value + ie.Document.GetElementById(lblPassword).Value + ie.Document.GetElementById(lblDelegatedTo).Value)
        ie.Document.GetElementById(lblBtnLogin).Click
        Do While ie.Busy Or ie.readyState <> 4
            DoEvents
        Loop
        ie.GoBack
        ie.GoBack
        Do While ie.Busy Or ie.readyState <> 4
            DoEvents
        Loop
        'ie.Navigate "http://192.168.1.156:8080/testing" & "/" & menuPage
        ie.Navigate "http://" & gStrWebServer & ":8080/" & app & "/" & menuPage
        Do While ie.Busy Or ie.readyState <> 4
            DoEvents
        Loop

        ie.Visible = True
End Sub
Public Sub getMenuFormESystem(ByVal menu_name As String, ByVal submenu_name As String, ByVal UserID As String, ByVal delegated As String, ByVal password As String) 'As ADODB.Recordset

Dim strSQL As String
Dim rec As ADODB.Recordset


        strSQL = " select submenu_name, menu_url, menu_loginPage, menu_txtLogin, menu_txtPassword, menu_ddlDelegatedTo, "
        strSQL = strSQL & " menu_btnLOgin, submenu_page, menu_parent_id from m_mainmenu_detail a join m_mainmenu b on"
        strSQL = strSQL & " a.menu_id = b.pk_id"
        strSQL = strSQL & " where b.menu_name='" & menu_name & "'"
        strSQL = strSQL & " and submenu_name='" & submenu_name & "'"

        Debug.Print strSQL
        Set rec = New ADODB.Recordset
        Set rec = GetRecordset(strSQL)
        'Set getMenuForm = rec


        Dim app As String
        Dim loginPage As String
        Dim menuPage As String
        Dim lblUserName As String
        Dim lblPassword As String
        Dim lblDelegatedTo As String
        Dim lblBtnLogin As String
        Dim Hfsystem As String

    'Set rec = getMenuForm("QA System", "Create New PPK")
        If Not rec.EOF Then
            app = Trim(rec!menu_url)
            loginPage = Trim(rec!menu_loginPage)
            lblUserName = Trim(rec!menu_txtLogin)
            lblPassword = Trim(rec!menu_txtPassword)
            lblDelegatedTo = Trim(rec!menu_ddlDelegatedTo)
            lblBtnLogin = Trim(rec!menu_btnLOgin)
            menuPage = Trim(rec!submenu_page)
            Hfsystem = menu_name
            gStrWebServer = "" & rec!Menu_parent_id
        Else
            MsgBox ("menu tidak ditemukan")
            Exit Sub
        End If


        Dim ie  As Object
        Set ie = CreateObject("InternetExplorer.Application")

       ' apiShowWindow ie.hwnd, SW_MAXIMIZE

        ie.Visible = True
        ie.Navigate "http://" & gStrWebServer & ":8080/"
        Do While ie.Busy Or ie.readyState <> 4
            DoEvents
        Loop
        ie.Navigate "http://" & gStrWebServer & ":8080/" & app & "/" & loginPage
        Do While ie.Busy Or ie.readyState <> 4
            DoEvents
        Loop

        '~~> Get the ID of the textbox where you want to output
        ie.Document.GetElementById(lblUserName).value = delegated
'
        ie.Document.GetElementById(lblPassword).value = password
        ie.Document.GetElementById(lblDelegatedTo).value = UserID
        ie.Document.GetElementById("Hfsystem").value = menu_name
        'MsgBox (ie.Document.GetElementById(lblUserName).Value + ie.Document.GetElementById(lblPassword).Value + ie.Document.GetElementById(lblDelegatedTo).Value)
        ie.Document.GetElementById(lblBtnLogin).Click
        Do While ie.Busy Or ie.readyState <> 4
            DoEvents
        Loop
        ie.GoBack
        ie.GoBack
        Do While ie.Busy Or ie.readyState <> 4
            DoEvents
        Loop
        'ie.Navigate "http://192.168.1.156:8080/testing" & "/" & menuPage
        ie.Navigate "http://" & gStrWebServer & ":8080/" & app & "/" & menuPage
        Do While ie.Busy Or ie.readyState <> 4
            DoEvents
        Loop



        ie.Visible = True
End Sub

'Public Sub getMenuPG3Form(ByVal menu_name As String, ByVal submenu_name As String, ByVal UserID As String, ByVal delegated As String, ByVal password As String)  'As ADODB.Recordset

 Public Sub getMenuPG3Form(ByVal menu_name As String, ByVal submenu_name As String, ByVal UserID As String, ByVal delegated As String, ByVal password As String)  'As ADODB.Recordset

        Dim app As String
        Dim loginPage As String
        Dim menuPage As String
        Dim lblUserName As String
        Dim lblPassword As String
        Dim lblDelegatedTo As String
        Dim lblBtnLogin As String
    '3   e-Procurement   WEB po-pg1  PG  NULL    1   2019-10-11 09:57:38.000 8b4b125b4cd52817240a7bf517e03d23    1   LoginVB.aspx    hfUsername  hfPassword  hfDelegatedTo   btnLoginVB  2001-01-01 00:00:00.000 GWN GWN
        app = "PO-PG3"
        loginPage = "LoginVB.aspx"
        lblUserName = "hfUsername"
        lblPassword = "hfPassword"
        lblDelegatedTo = "hfDelegatedTo"
        lblBtnLogin = "btnLoginVB"
        menuPage = "default.aspx"
        gStrWebServer = "web.lapilabs.co.id"

        Dim ie  As Object
        Set ie = CreateObject("InternetExplorer.Application")

     '   apiShowWindow ie.hwnd, SW_MAXIMIZE

        ie.Visible = True
        ie.Navigate "http://" & gStrWebServer & ":8080/"
        Do While ie.Busy Or ie.readyState <> 4
            DoEvents
        Loop
        ie.Navigate "http://" & gStrWebServer & ":8080/" & app & "/" & loginPage
        Do While ie.Busy Or ie.readyState <> 4
            DoEvents
        Loop

        '~~> Get the ID of the textbox where you want to output
        ie.Document.GetElementById(lblUserName).value = delegated
'
        ie.Document.GetElementById(lblPassword).value = password
        ie.Document.GetElementById(lblDelegatedTo).value = UserID
        'MsgBox (ie.Document.GetElementById(lblUserName).Value + ie.Document.GetElementById(lblPassword).Value + ie.Document.GetElementById(lblDelegatedTo).Value)
        ie.Document.GetElementById(lblBtnLogin).Click
        Do While ie.Busy Or ie.readyState <> 4
            DoEvents
        Loop
        ie.GoBack
        ie.GoBack
        Do While ie.Busy Or ie.readyState <> 4
            DoEvents
        Loop
        'ie.Navigate "http://192.168.1.156:8080/testing" & "/" & menuPage
        ie.Navigate "http://" & gStrWebServer & ":8080/" & app & "/" & menuPage
        Do While ie.Busy Or ie.readyState <> 4
            DoEvents
        Loop



        ie.Visible = True



End Sub
Public Sub getMenuMDPGoj(ByVal menu_name As String, ByVal submenu_name As String, ByVal UserID As String, ByVal delegated As String, ByVal password As String)

        Dim app As String
        Dim loginPage As String
        Dim menuPage As String
        Dim lblUserName As String
        Dim lblPassword As String
        Dim lblDelegatedTo As String
        Dim lblBtnLogin As String

        app = "mdpprintgoj"
'        loginPage = "LoginVB.aspx"
'        lblUserName = "hfUsername"
'        lblPassword = "hfPassword"
'        lblDelegatedTo = "hfDelegatedTo"
'        lblBtnLogin = "btnLoginVB"
        menuPage = "printmsoform.aspx"
        gStrWebServer = "web.lapilabs.co.id"

        Dim ie  As Object
        Set ie = CreateObject("InternetExplorer.Application")

     '   apiShowWindow ie.hwnd, SW_MAXIMIZE

'        ie.Visible = True
'        ie.Navigate "http://web.lapilabs.co.id:8080/"
'        Do While ie.Busy Or ie.readyState <> 4
'            DoEvents
'        Loop
'        ie.Navigate "http://web.lapilabs.co.id:8080/" & app & "/" & loginPage
'        Do While ie.Busy Or ie.readyState <> 4
'            DoEvents
'        Loop

        '~~> Get the ID of the textbox where you want to output
'        ie.Document.GetElementById(lblUserName).Value = delegated
''
'        ie.Document.GetElementById(lblPassword).Value = password
'        ie.Document.GetElementById(lblDelegatedTo).Value = UserID
'        'MsgBox (ie.Document.GetElementById(lblUserName).Value + ie.Document.GetElementById(lblPassword).Value + ie.Document.GetElementById(lblDelegatedTo).Value)
'        ie.Document.GetElementById(lblBtnLogin).Click
'        Do While ie.Busy Or ie.readyState <> 4
'            DoEvents
'        Loop
'        ie.GoBack
'        ie.GoBack
'        Do While ie.Busy Or ie.readyState <> 4
'            DoEvents
'        Loop
        'ie.Navigate "http://192.168.1.156:8080/testing" & "/" & menuPage
        ie.Navigate "http://" & gStrWebServer & ":8080/" & app & "/" & menuPage
        Do While ie.Busy Or ie.readyState <> 4
            DoEvents
        Loop



        ie.Visible = True



End Sub


Function doLogin() As Boolean
On Error GoTo Err

    Dim token As String
    Dim appName As String
    Dim progName As String
    Dim menuName As String
    Dim ipAddr As String
    Dim tokenProgram As String
    Dim varTemp1 As Variant
    Dim varTemp As Variant
    Dim intTemp As Integer
    varTemp1 = Split(Command(), ":")
    varTemp = Split(varTemp1(1), ";")
    For intTemp = 0 To UBound(varTemp)
        If varTemp(intTemp) <> "" Then
            Select Case intTemp
                Case 0
                    appName = Trim(varTemp(intTemp))
                Case 1
                    token = Trim(varTemp(intTemp))
                Case 2
                    progName = Trim(varTemp(intTemp))
                Case 3
                    menuName = Trim(varTemp(intTemp))
                Case 4
                    tokenProgram = Trim(varTemp(intTemp))
                Case 5
                    ipAddr = Trim(varTemp(intTemp))
                Case 6
                    menuToken = Trim(varTemp(intTemp))
            End Select
        End If
    Next

    If (isValidTokenVersion(tokenProgram) = True) Then
        If (isValidToken(token, ipAddr) = True) Then
            'MsgBox ("dologin")
            doLogin = True
        Else
            MsgBox ("Token not valid")
        End If
    Else
        'copyUpdate (gstrFilename)
        MsgBox ("program is not valid version, program has been updated, please re run the program")

    End If
Exit Function
Err:
    MsgBox "Mohon hubungi IT, Error Code : LGN"
End Function

Function isValidTokenVersion(ByVal tokenProgram As String) As Boolean

    Dim strSQL As String
    Dim rec As ADODB.Recordset
    If tokenProgram <> "" Then
        strSQL = " select menu_token from m_mainmenu where menu_name='" & ProgramName & "' and menu_version='" & ProgramVersion & "' and menu_version_date='" & ProgramVersionDate & "'"
        Set rec = New ADODB.Recordset
        Set rec = GetRecordset(strSQL)
        If Not rec.EOF Then
            If (Trim(rec!menu_token) = tokenProgram) Then
                isValidTokenVersion = True
            Else
                isValidTokenVersion = False
            End If
        Else
            isValidTokenVersion = False
        End If
        If rec.State = adStateOpen Then rec.Close
        Set rec = Nothing
    Else
        isValidTokenVersion = False
    End If

End Function

Function getMenuForm_(ByVal menuToken_ As String) As String

Dim strSQL As String
Dim rec As ADODB.Recordset
    If menuToken_ <> "" Then

        strSQL = "select submenu_module as menuForm from m_mainmenu_detail where submenu_token = '" & menuToken_ & "'"
        'strSQL = " select menu_token from m_mainmenu where menu_name='" & ProgramName & "' and menu_version='" & ProgramVersion & "' and convert(varchar(255),menu_version_date,120)='" & token & "'"
        Set rec = New ADODB.Recordset

        Set rec = GetRecordset(strSQL)
        If Not rec.EOF Then
            getMenuForm_ = Trim(rec!menuForm)
        Else
            getMenuForm_ = ""
        End If
        If rec.State = adStateOpen Then rec.Close
        Set rec = Nothing
    Else
        getMenuForm_ = ""
    End If

End Function


Function isValidToken(ByVal token As String, ByVal ipAddr As String) As Boolean

Dim strSQL As String
Dim rec As ADODB.Recordset
    If token <> "" Then

        strSQL = "exec token_get '" & token & "','Mainmenu','','" & ipAddr & "'"
        'strSQL = " select menu_token from m_mainmenu where menu_name='" & ProgramName & "' and menu_version='" & ProgramVersion & "' and convert(varchar(255),menu_version_date,120)='" & token & "'"
        Set rec = New ADODB.Recordset

        Set rec = GetRecordset(strSQL)
        If Not rec.EOF Then
            If (Trim(rec!result) = "1") Then
                gstrUserName = Trim(rec!UserID)
                gstrDelegatedTo = Trim(rec!delegatedTo)
                gstrEmployeeName = Trim(rec!Nama)

                isValidToken = True

            Else
                isValidToken = False
            End If
        Else
            isValidToken = False
        End If
        If rec.State = adStateOpen Then rec.Close
        Set rec = Nothing
    Else
        isValidToken = False
    End If

End Function

Sub Main()
    'di non aktifkan tgl 2019-05-17
    'MsgBox "Application Not Available!", vbCritical, "No Available!"
    'End
    'On Error GoTo errmsg
    'gvarBackGroundColor = "&H00C0FFFF&" 'kuning muda
    gvarBackGroundColor = &HC0FFFF    'kuning muda
    Dim recTemp As ADODB.Recordset
    Dim DbasePath As String, DBaseName As String
    Set recTemp = New ADODB.Recordset
    Set gobjConnStart = New ADODB.Connection

    gobjConnStart.IsolationLevel = adXactReadCommitted
'    MsgBox (Command)
    If gstrWithoutLogin = "" Then
        'connect to mdb first to ensure the database location
        DBaseName = "\LP.mdb"
        DbasePath = CStr(app.path + DBaseName)
        gobjConnStart.Open "Provider=Microsoft.Jet.OLEDB.4.0;" & _
                           "Data Source= " + DbasePath + ";" & _
                           "Persist Security Info=False;Jet OLEDB:Database Password=ciujung"

        recTemp.Open "Select DBPath, DBName1, ExePath, User, Password, DBPath2, DBName2, User2, Password2 from M_DataBase", gobjConnStart, adOpenStatic

        gstrDataSource = recTemp.Fields(0)
        gstrDbaseName = recTemp.Fields(1)
'        gstrPathExe = recTemp.Fields(2)
        gstrPathExe = app.path 'ary update 2014/12/14
        gstrUserSA = recTemp.Fields(3)
        gstrPasswordSA = recTemp.Fields(4)

        '--- 2nd connection
        gstrDbaseName2 = recTemp.Fields("DBName2")
        gstrDataSource2 = recTemp.Fields("DBPath2")
        gstrUserSA2 = recTemp.Fields("User2")
        gstrPasswordSA2 = recTemp.Fields("Password2")

    Else 'Tidak link ke LP.MDB
        gstrDataSource = "sql.lapilabs.co.id"
        gstrDbaseName = "lapifactory"
        gstrPathExe = ""
        gstrUserSA = "sa"
        gstrPasswordSA = "ygi_dny_jny_0902_apl"

        '--- 2nd connection
        gstrDbaseName2 = "sql.lapilabs.co.id"
        gstrDataSource2 = "lapifactory"
        gstrUserSA2 = "sa"
        gstrPasswordSA2 = "ygi_dny_jny_0902_apl"

    End If

    ' if connect using ADODB
    Connect_ADO gstrDbaseName, gstrDataSource

    ' if connect using ADODC via control per form
    gstrADODC_Conn = CStr("Provider=SQLOLEDB.1;Password=" & gstrPasswordSA & ";" & _
                     "Persist Security Info=True;User ID=" & gstrUserSA & ";" & _
                     "ConnectionTimeout = 36000;" & _
                     "Initial Catalog='" & gstrDbaseName & "';Data Source=" + gstrDataSource)



    ' menyeragamkan pesan dengan function MESSAGE()
    Inisialisasi_Pesan

    ' Pengecekan apakah modGlobal ini dijalankan via mainmenu utama atau langsung dari masing2 aplikasi(exe)
    ' Jika ada parameter yg dikirim, maka modGlobal ini dipanggil dari mainmenu, else maka modGlobal ini dipanggil lgsg dari masing2 aplikasi
    If gstrWithoutLogin = "" Then
        If Len(Trim(Command())) = 0 Then
            frmLogin.Show 1
        Else
            Get_Login
            frmMainMenu.Show 1


'            'If (doLogin = True) Then
'            If (doLogin = True) Then
'                'Get_Login
'                Dim F As Form
'                'MsgBox (getMenuForm(menuToken))
'                Set F = Forms.Add(getMenuForm(menuToken))
'                F.Show
'
'                'frmMainMenu.Show 1

'            End If
        End If
    Else
   'atm.Tag = "REMINDER PEMUSNAHAN PADA QUALITY CONTROL MIKROBIOLOGI"
'    atm.Tag = "REMINDER PENURUNAN ULANG WORKING STANDARD"
'        atm.Tag = "REMINDER MANUF DATE"
'        atm.Tag = "REMINDER TTB GENERAL"
'        atm.Tag = "REMINDER LABEL QA"
'        atm.Tag = "REMINDER KALIBRASI"
'        atm.Tag = "REMINDER APPROVE PELULUSAN PRODUK"
'        atm.Tag = "REMINDER JADWAL STABILITAS"
'        atm.Tag = "REMINDER STOCK MASUK RD WAREHOUSE"
'        atm.Tag = "REMINDER DISPOSISI BAHAN AWAL"
'        atm.Tag = "REMINDER TEMPEL LABEL QA"
'        atm.Tag = "REMINDER PENERIMAAN SAMPLE AD"
'        atm.Tag = "REMINDER KODE REVISI RD"
'        atm.Tag = "REMINDER STATUS PPE"
'        atm.Tag = "Remainder uji ulang ED supplier"
'        atm.Tag = "REMINDER ED"
'         atm.Tag = "STATUS ANALISA QC"
'         atm.Tag = "REMINDER KODE REVISI PC": atm.Caption = "REMINDER KODE REVISI PC"
'         atm.Tag = "REMINDER PERMINTAAN SL"
'          atm.Tag = "STATUS TENGGAT WAKTU"
'        atm.Show
'

    End If
'    frmLogin.txtUserName.Text = "ASN"

    Exit Sub
errmsg:
    MsgBox "Error Connection, Contact Your IT Administrator !!!" & vbCrLf & vbCrLf & Err.Description, vbCritical, Default_Message_Title
    frmSetupDatabase.Show 1

End Sub

Public Sub Connect_ADO(ByVal gstrDbaseName As String, ByVal gstrDataSource As String)

    Set gobjConn = New ADODB.Connection
    gobjConn.IsolationLevel = adXactReadCommitted
    gobjConn.ConnectionTimeout = 0
    gobjConn.CommandTimeout = 0

    On Error GoTo OtherConn
        gobjConn.Open "Provider=SQLOLEDB.1;Password=" & gstrPasswordSA + ";" & _
                  "Persist Security Info=True;User ID='" & gstrUserSA & "';" & _
                  "Initial Catalog='" & gstrDbaseName & "';Data Source=" + gstrDataSource

        Exit Sub
OtherConn:
        gobjConn.Open "Provider=SQLNCLI;Password=" & gstrPasswordSA + ";" & _
                  "Persist Security Info=True;User ID='" & gstrUserSA & "';" & _
                  "Initial Catalog='" & gstrDbaseName & "';Data Source=" + gstrDataSource




'    gobjConn.Open "Provider=SQLOLEDB.1;Password=lapiitadmin;" & _
'                      "Persist Security Info=True;User ID=salapi;" & _
'                      "Initial Catalog='" & gstrDbaseName & "';Data Source=" + gstrDataSource

End Sub
Public Sub Connect_ADO2(ByVal gstrDbaseName2 As String, ByVal gstrDataSource2 As String)



    Set gobjConn2 = New ADODB.Connection
    gobjConn2.IsolationLevel = adXactReadCommitted

    On Error GoTo OtherConn


        gobjConn2.Open "Provider=SQLOLEDB.1;Password=" & gstrPasswordSA2 + ";" & _
                  "Persist Security Info=True;User ID='" & gstrUserSA2 & "';" & _
                  "Initial Catalog='" & gstrDbaseName2 & "';Data Source=" + gstrDataSource2
        Exit Sub
OtherConn:


         gobjConn2.Open "Provider=SQLNCLI;Password=" & gstrPasswordSA2 + ";" & _
                  "Persist Security Info=True;User ID='" & gstrUserSA2 & "';" & _
                  "Initial Catalog='" & gstrDbaseName2 & "';Data Source=" + gstrDataSource2


'    gobjConn.Open "Provider=SQLOLEDB.1;Password=lapiitadmin;" & _
'                      "Persist Security Info=True;User ID=salapi;" & _
'                      "Initial Catalog='" & gstrDbaseName & "';Data Source=" + gstrDataSource

End Sub


Public Function GetRecordset(pi_strSQL, Optional OpenStatic As Boolean = True) As ADODB.Recordset
    Dim recTemp As ADODB.Recordset

    Set recTemp = New ADODB.Recordset

    'rsTemp.CursorLocation = adUseClient
    If OpenStatic Then
        recTemp.Open pi_strSQL, gobjConn, adOpenStatic
    Else
        recTemp.Open pi_strSQL, gobjConn
    End If

    'rsTemp.ActiveConnection = Nothing
    Set GetRecordset = recTemp
End Function

Public Function GetRecordsetSP(ByVal sp_name As String, Optional param As String = "") As ADODB.Recordset
    Dim recTemp As ADODB.Command
    Dim rs As ADODB.Recordset
    Dim varSQL As Variant
    Dim varSQL2 As Variant
    Dim I As Integer
    Set recTemp = New ADODB.Command

    'rsTemp.CursorLocation = adUseClient

    recTemp.ActiveConnection = gobjConn
    recTemp.CommandType = adCmdStoredProc
    recTemp.CommandText = sp_name

    varSQL = Split(param, ",")

    For I = 0 To UBound(varSQL)
        If varSQL(I) <> "" Then
'        MsgBox (varSQL(i))
        varSQL2 = Split(varSQL(I), ":")
            recTemp.Parameters.Append recTemp.CreateParameter(varSQL2(0), adVarChar, adParamInput, 255, varSQL2(1))
        End If
    Next I

    'cmd.Parameters.Append cmd.CreateParameter (
    '    ("empid", adVarChar, adParamInput, 6, str_empid)
    Set rs = recTemp.Execute
    Set GetRecordsetSP = rs
End Function

'Public Function GetRecordset2(pi_strSQL As String, Optional Open_Static As Boolean = True) As Recordset
'Dim rsTemp As ADODB.Recordset
'Set rsTemp = New ADODB.Recordset
'
'If gobjConn.State = adStateClosed Then
'    gobjConn.ConnectionTimeout = 0
'End If
'rsTemp.CursorLocation = adUseClient
'If Open_Static = True Then
'    rsTemp.Open pi_strSQL, gobjConn, adOpenStatic
'Else
'    rsTemp.Open pi_strSQL, gobjConn, adOpenForwardOnly
'End If
'rsTemp.ActiveConnection = Nothing
'
'Set GetRecordset2 = rsTemp
'
'End Function

Public Function Execute(varSQLTemp, Optional blnMessage As Boolean = True) As Boolean
Dim varSQL As Variant
Dim I As Long
    Execute = True
On Error GoTo ErrHandler
    varSQL = Split(varSQLTemp, SQL_Delimiter)
    If gobjConn.State = adStateOpen Then gobjConn.Close
    gobjConn.Open gstrADODC_Conn
    gobjConn.CommandTimeout = 0
    gobjConn.BeginTrans
    For I = 0 To UBound(varSQL)
        If varSQL(I) <> "" Then
            gobjConn.Execute varSQL(I)
        End If
    Next
    gobjConn.CommitTrans

    Exit Function
    'gObjconn.Close
    'Set gObjconn = NothingExit Function
ErrHandler:
    gobjConn.RollbackTrans
    Execute = False

    If blnMessage = True Then
        MsgBox "You should contact IT !" & vbCrLf & vbCrLf & Err.Description, vbCritical, Default_Message_Title
    End If
End Function

Public Function Execute2(varSQLTemp, Optional blnMessage As Boolean = True) As Boolean
Dim varSQL As Variant
Dim I As Long
    Execute2 = True
On Error GoTo ErrHandler
    varSQL = Split(varSQLTemp, SQL_Delimiter)
    If gobjConn.State = adStateOpen Then gobjConn.Close
    gobjConn.Open gstrADODC_Conn2
    gobjConn.CommandTimeout = 0
    gobjConn.BeginTrans
    For I = 0 To UBound(varSQL)
        If varSQL(I) <> "" Then
            gobjConn.Execute varSQL(I)
        End If
    Next
    gobjConn.CommitTrans

    Exit Function
    'gObjconn.Close
    'Set gObjconn = NothingExit Function
ErrHandler:
    gobjConn.RollbackTrans
    Execute2 = False

    If blnMessage = True Then
        MsgBox "You should contact IT !" & vbCrLf & vbCrLf & Err.Description, vbCritical, Default_Message_Title
    End If
End Function


Public Sub ExitAll()
    Dim frm As Form

    ' Loop through all open forms and close them
    For Each frm In Forms
              Unload frm
    Next frm
    Unload frmLogin
End Sub

Public Function CryptString(txtString As String, EnCrypt As Boolean) As String

    Dim Crypt As Object

    Set Crypt = CreateObject("Crypto.ClsCrypto")
    CryptString = Crypt.CryptString(txtString, EnCrypt)

End Function

'--------------------------------------------------------------------------------
' Procedure  :       findAndFocusWindow
' Description:       find a window based on name and focus on that window if the window's name found
' Parameters :       Window's Title that you're looking (String)
' return     :       true if window is not found
'                    false if window is found and the system automaticly focus on that window
'--------------------------------------------------------------------------------
'if Windows state is minimized window cannot get focus
'Public Function findAndFocusWindow(windowTitle As String) As Boolean
'     findAndFocusWindow = True
''  lHwnd = FindWindow(vbNullString, windowTitle)
''    If lHwnd <> 0 Then
''
''        MsgBox windowTitle & " Already Open !", vbInformation, Default_Message_Title
''        ShowWindow lHwnd, 1
''        'Added this line by budiyanto to fix bug
''        '-------------------------------------------
''            BringWindowToTop lHwnd
''        '-------------------------------------------
''
''        findAndFocusWindow = False
''    Else
''        findAndFocusWindow = True
''    End If
'End Function

Private Function IsProcessRunning(ByVal sProcess As String) As Boolean
    Const MAX_PATH As Long = 260
    Dim lProcesses() As Long, lModules() As Long, N As Long, lRet As Long, hProcess As Long
    Dim sName As String

    sProcess = UCase$(sProcess)

    ReDim lProcesses(1023) As Long
    If EnumProcesses(lProcesses(0), 1024 * 4, lRet) Then
        For N = 0 To (lRet \ 4) - 1
            hProcess = OpenProcess(PROCESS_QUERY_INFORMATION Or PROCESS_VM_READ, 0, lProcesses(N))
            If hProcess Then
                ReDim lModules(1023)
                If EnumProcessModules(hProcess, lModules(0), 1024 * 4, lRet) Then
                    sName = String$(MAX_PATH, vbNullChar)
                    GetModuleBaseName hProcess, lModules(0), sName, MAX_PATH
                    sName = Left$(sName, InStr(sName, vbNullChar) - 1)
                    If Len(sName) = Len(sProcess) Then
                        If sProcess = UCase$(sName) Then IsProcessRunning = True: Exit Function
                    End If
                End If
            End If
            CloseHandle hProcess
        Next N
    End If
End Function

Public Function findAndFocusWindow(windowTitle As String, namaExe As String) As Boolean
Dim strTemp As String
Dim recTemp As ADODB.Recordset

  findAndFocusWindow = True
  lHwnd = 0
  lHwnd = FindWindow(vbNullString, windowTitle)
    If lHwnd <> 0 Then
        If UCase(windowTitle) = UCase("ePerencanaan, Pengendalian Produksi dan Persediaan") Or UCase(windowTitle) = UCase("ePengendalian Bahan Awal / Bahan Kemas") Or UCase(windowTitle) = UCase("ePengendalian Produk Jadi & Pengiriman") Then
            findAndFocusWindow = True
        Else
            'MsgBox windowTitle & " Already Open !", vbInformation, Default_Message_Title
            'findAndCloseWindow windowTitle, "IT01.exe"
            'findAndFocusWindow = True

            If (IsProcessRunning(namaExe)) Then
                findAndCloseWindow windowTitle, namaExe
                'ShowWindow lHwnd, 1
                'BringWindowToTop lHwnd
                'findAndFocusWindow = False
                findAndFocusWindow = True
            Else
                findAndFocusWindow = True
            End If
        End If
    Else
        'findAndCloseWindow windowTitle, "IT01.exe"
        findAndFocusWindow = True
    End If

End Function


'--------------------------------------------------------------------------------
' Procedure  :       findAndCloseWindow
' Description:       find a window based on name and close that window
' Parameters :       Window's Title that you're looking (String)
'--------------------------------------------------------------------------------
'problem happened in some windows that called made to this function will activate shutdown window dialog
Public Sub findAndCloseWindow(windowTitle As String, exeName As String)
     lHwnd = FindWindow(vbNullString, windowTitle)
      ' added this line to solve bug
     '---------------------------------
     If lHwnd <> 0 Then
     '---------------------------------
        'lHwnd = SendMessage(lHwnd, WM_SYSCOMMAND, SC_CLOSE, NILL)
        Shell "taskkill.exe /f /t /im " & exeName
     End If
End Sub

Private Sub Get_Login()
    Dim varTemp As Variant
    Dim intTemp As Integer
    varTemp = Split(Command(), SQL_Delimiter)

    For intTemp = 0 To UBound(varTemp)
        If varTemp(intTemp) <> "" Then
            Select Case intTemp
                Case 0
                    gstrUserName = Trim(varTemp(intTemp))

                Case 1
                    gstrEmployeeName = Trim(varTemp(intTemp))

                Case 2
                    gstrTahunBulan = Trim(varTemp(intTemp))
                    gdtmPeriod = DateValue(Right(gstrTahunBulan, 2) & "-01-" & Left(gstrTahunBulan, 4))

                Case 3
                    gstrDelegatedTo = Trim(varTemp(intTemp))
                    ' add by budi
                Case 4
                    gstrPassword = Trim(varTemp(intTemp))

                Case 5
                    gStrSystem = Trim(varTemp(intTemp))

            End Select
        End If
    Next

    If gstrDepartment = "" Then
        gstrDepartment = Get_DeptID(gstrUserName)
    End If
End Sub

Public Function Get_Document_Info(vDocument As String, vIndex As Integer) As String
    Dim varTemp As Variant

    varTemp = Split(vDocument, "/")
    Get_Document_Info = Trim(varTemp(vIndex))

End Function

Public Function Get_Romawi(intBln As Integer) As String

Select Case intBln
    Case Is = 1
        Get_Romawi = "I"
    Case Is = 2
        Get_Romawi = "II"
    Case Is = 3
        Get_Romawi = "III"
    Case Is = 4
        Get_Romawi = "IV"
    Case Is = 5
        Get_Romawi = "V"
    Case Is = 6
        Get_Romawi = "VI"
    Case Is = 7
        Get_Romawi = "VII"
    Case Is = 8
        Get_Romawi = "VIII"
    Case Is = 9
        Get_Romawi = "IX"
    Case Is = 10
        Get_Romawi = "X"
    Case Is = 11
        Get_Romawi = "XI"
    Case Is = 12
        Get_Romawi = "XII"
End Select

End Function

Public Function ComputerName() As String
  Dim sBuffer As String

  Dim lAns As Long

  sBuffer = Space$(255)
  lAns = GetComputerName(sBuffer, 255)
  If lAns <> 0 Then
        'read from beginning of string to null-terminator
        ComputerName = Left$(sBuffer, InStr(sBuffer, Chr(0)) - 1)
   Else
        Err.Raise Err.LastDllError, , _
          "A system call returned an error code of " _
           & Err.LastDllError
   End If

End Function

Public Function Ask(ByVal sPesan As String) As Boolean
    If MsgBox(sPesan, vbYesNo + vbQuestion, "AMLD") = vbYes Then Ask = True
End Function

Public Sub Info(ByVal sPesan As String)
    MsgBox sPesan, vbInformation, "AMLD"
End Sub

Public Sub Warn(ByVal sPesan As String)
    MsgBox sPesan, vbExclamation, "Warning"
End Sub

Public Sub errmsg(ByVal sPesan As String)
    MsgBox sPesan & vbCrLf & Err.NUMBER & " : " & Err.Description, vbCritical, "Kesalahan"
End Sub


Public Function isRecordExist(ByRef CN As ADODB.Connection, ByVal sTable As String, ByVal sFieldString As String, ByVal sValue As String, Optional ByVal sNumValue As Double, Optional ByVal sIsNumeric As Boolean) As Boolean
    Dim rs As ADODB.Recordset
    Set rs = New ADODB.Recordset
    rs.CursorLocation = adUseClient
    If sIsNumeric Then
        rs.Open "SELECT " & sFieldString & " FROM " & sTable & " WHERE " & sFieldString & " = " & Replace(Trim$(sNumValue), ",", "."), _
        CN, adOpenForwardOnly, adLockReadOnly
    Else
        rs.Open "SELECT " & sFieldString & " FROM " & sTable & " WHERE " & sFieldString & " = '" & Replace(Trim$(sValue), "'", "''") & "'", _
        CN, adOpenForwardOnly, adLockReadOnly
    End If
    If rs.RecordCount < 1 Then isRecordExist = False Else isRecordExist = True
    rs.Close
    Set rs = Nothing
End Function



'added ipy 26012017
Public Function HitungHK(strTgl1 As String, strTgl2 As String) As String

Dim strSQL As String
Dim rec As ADODB.Recordset
    If strTgl1 <> "" And strTgl1 <> "-" And strTgl2 <> "" And strTgl2 <> "-" Then
        strSQL = "Select dbo.fn_JumlahHariKerja('" & strTgl1 & "','" & strTgl2 & "') as jum "
        Set rec = New ADODB.Recordset
        Set rec = GetRecordset(strSQL)
        If Not rec.EOF Then
            HitungHK = Trim(rec!jum)
            If HitungHK < 0 Then HitungHK = 0
        Else
            HitungHK = "0"
        End If
        If rec.State = adStateOpen Then rec.Close
        Set rec = Nothing
    Else
        HitungHK = ""
    End If
End Function


'added ipy 26012017
Public Function Get_PenjumlahanHK(strTgl As String, HK As Integer) As String

Dim strSQL As String
Dim rec As ADODB.Recordset
    If strTgl <> "" And strTgl <> "-" Then
        strSQL = "Select dbo.fnPenjumlahanHrKerja('" & strTgl & "','" & HK & "') as defdate "
        Set rec = New ADODB.Recordset
        Set rec = GetRecordset(strSQL)
        If Not rec.EOF Then
            Get_PenjumlahanHK = Trim(rec!defdate)
        Else
            Get_PenjumlahanHK = "1900-01-01"
        End If
        If rec.State = adStateOpen Then rec.Close
        Set rec = Nothing
    Else
        Get_PenjumlahanHK = ""
    End If

End Function


'Public Sub SpreadKeyUp(fpDetail As fpSpread, KeyCode As Integer, Optional ColID As Long = 1)
'Dim sSql As String
'Dim vvar As Variant
'    Select Case KeyCode
'        Case vbKeyDown
'            With fpDetail
'                .GetText ColID, .ActiveRow, vvar
'                If Trim(vvar) <> "" Then
'                    If .ActiveRow = .MaxRows Then
'                        .MaxRows = .MaxRows + 1
'                        .SetActiveCell ColID, .MaxRows
'                    End If
'                End If
'                If .MaxRows = 0 Then
'                    .MaxRows = .MaxRows + 1
'                    .SetActiveCell ColID, .MaxRows
'                End If
'            End With
'        Case vbKeyDelete
'            With fpDetail
'                If .EditMode Then Exit Sub
'                If .MaxRows <> 0 Then
'                    .GetText ColID, .ActiveRow, vvar
'                    If Trim(vvar) <> "" Then
'                        'If MsgBox("Are you sure to delete '" + Trim(vvar) + "' ?", vbQuestion + vbYesNo + vbDefaultButton2, "Delete Data") = vbYes Then
'                            .DeleteRows .ActiveRow, 1
'                            .MaxRows = .MaxRows - 1
'                        'End If
'                    Else
'                        .DeleteRows .ActiveRow, 1
'                        .MaxRows = .MaxRows - 1
'                    End If
'                    .SetFocus
'                End If
'            End With
'        Case vbKeyInsert
'            With fpDetail
'                If .EditMode Then Exit Sub
'                .GetText ColID, .ActiveRow, vvar
'                If Trim(vvar) <> "" Then
'                    If .MaxRows <> 0 Then
'                       .MaxRows = .MaxRows + 1
'                       .InsertRows .ActiveRow, 1
'                    End If
'                End If
'            End With
'    End Select
'End Sub
'
'Public Sub LockSpreadCol(tSpread As fpSpread, Col As Integer, Col2 As Integer, ByVal Kondisi As Boolean)
'    With tSpread
'        .Col = Col
'        .Col2 = Col2
'        .Row = 1
'        .Row2 = .MaxRows
'        .BlockMode = True
'        .Lock = Kondisi
'        .Protect = True
'        .BlockMode = False
''        .LockBackColor = ColorDisable
'    End With
'End Sub
'
'Public Sub LockSpreadRow(tSpread As fpSpread, Row As Integer, Row2 As Integer, ByVal Kondisi As Boolean)
'    With tSpread
'        .Row = Row
'        .Row2 = Row2
'        .BlockMode = True
'        .Lock = Kondisi
'        .Protect = True
'        .BlockMode = False
''        .LockBackColor = ColorDisable
'    End With
'End Sub
'Public Sub LockSpread(tSpread As fpSpread, Col As Long, Col2 As Long, Row As Long, Row2 As Long, ByVal Kondisi As Boolean)
'    With tSpread
'        .Col = Col
'        .Col2 = Col2
'        .Row = Row
'        .Row2 = Row2
'        .BlockMode = True
'        .Lock = Kondisi
'        .Protect = True
'        .BlockMode = False
''        .LockBackColor = ColorDisable
'    End With
'End Sub
'Public Sub AllowSortSpread(tSpread As fpSpread)
'    With tSpread
'        .AllowColMove = False
'        .AllowRowMove = True
'        .UserColAction = UserColActionSort
'    End With
'End Sub






Private Sub SendRequest(url As String)
    '#postgres
Dim xmlHttp As Object
    Set xmlHttp = CreateObject("MSXML2.ServerXMLHTTP")
    xmlHttp.Open "GET", url, False
    xmlHttp.setRequestHeader "Content-Type", "text/xml"
    xmlHttp.Send
    ShellExecute 0&, "open", "chrome.exe", url, vbNullString, SW_SHOWNORMAL
    Set xmlHttp = Nothing


End Sub



Public Sub getMenuFormPostGres(ByVal menu_name As String, ByVal submenu_name As String, ByVal UserID As String, ByVal delegated As String, ByVal password As String, ByVal namaMenu As String) 'As ADODB.Recordset
    '''' getMenuFormPostGres "ePengembanganKemasan", "mnuMinor_Tel_DO", gstrUserName, gstrDelegatedTo, "pwd"
     '#postgres
    Dim textString
    'Dim namaMenu As String

    'UserID = "ade"
    'delegatedTo = "ara"
    'namaAplikasi = "ePengembanganKemasan"
    'namaMenu = "mnuMinor_Tell_Do"


    'textString = "{""userId"":""" & UserID & """,""delegatedTo"":""" & delegated & """,""namaAplikasi"":""" & menu_name & """}"
    textString = "{""userId"":""" & UserID & """,""delegatedTo"":""" & delegated & """,""namaAplikasi"":""" & menu_name & """,""namaMenu"":""" & namaMenu & """}"
    'Dim encryptedText As String


    Dim xmlHttp As Object

    Set xmlHttp = CreateObject("MSXML2.XMLHTTP")

    xmlHttp.Open "POST", "http://192.168.1.24/api/general/encrypt", False
    xmlHttp.setRequestHeader "Content-Type", "application/json"
    'xmlhttp.send "{""userId"":""" & userId & """,""delegatedTo"":""" & delegated & """,""namaAplikasi"":""" & menu_name & """,""namaMenu"":""" & namaMenu & """}"
    xmlHttp.Send textString

Debug.Print textString
Debug.Print xmlHttp.responseText

    SendRequest "http://192.168.1.24/" & menu_name & "/authentication?token=" & xmlHttp.responseText
End Sub

Public Sub getMenuFormBD(ByVal menu_name As String, ByVal submenu_name As String, ByVal UserID As String, ByVal delegated As String, ByVal password As String)
Dim strSQL As String
Dim rec As ADODB.Recordset


        strSQL = " select submenu_name, menu_url, menu_loginPage, menu_txtLogin, menu_txtPassword, menu_ddlDelegatedTo, "
        strSQL = strSQL & " menu_btnLOgin, submenu_page, menu_parent_id from m_mainmenu_detail a join m_mainmenu b on"
        strSQL = strSQL & " a.menu_id = b.pk_id"
        strSQL = strSQL & " where b.menu_name='" & menu_name & "'"
        strSQL = strSQL & " and submenu_name='" & submenu_name & "'"

        Set rec = New ADODB.Recordset
        Set rec = GetRecordset(strSQL)
        'Set getMenuForm = rec

        Dim app As String
        Dim loginPage As String
        Dim menuPage As String
        Dim lblUserName As String
        Dim lblPassword As String
        Dim lblDelegatedTo As String
        Dim lblBtnLogin As String
        Dim a As String

    'Set rec = getMenuForm("QA System", "Create New PPK")
        If Not rec.EOF Then
            app = Trim(rec!menu_url)
            loginPage = Trim(rec!menu_loginPage)
            loginPage = Replace(loginPage, "[UserID]", delegated)
            loginPage = Replace(loginPage, "[DelegatedTo]", UserID)
            loginPage = Replace(loginPage, "[Token]", getToken(delegated))

            'lblUserName = Trim(rec!menu_txtLogin)
            'lblPassword = Trim(rec!menu_txtPassword)
            'lblDelegatedTo = Trim(rec!menu_ddlDelegatedTo)
            'lblBtnLogin = Trim(rec!menu_btnLOgin)
            menuPage = Trim(rec!submenu_page)
            gStrWebServer = "" & rec!Menu_parent_id
        Else
            MsgBox ("menu tidak ditemukan")
            Exit Sub
        End If


'        Dim objShell, objExec As Object
'        Set objShell = CreateObject("WScript.Shell")
'        Set objExec = objShell.Exec("C:\Program Files\Google\Chrome\Application\chrome.exe http://192.168.1.159:8081/HRIS/" & loginPage & "?page=" & menuPage)
'
        a = "cmd /c start chrome" & " ""http://" & gStrWebServer & ":8084/BDSystem/" & loginPage & "&page=" & menuPage
        ' khusus chrome dengan java hasil jadi sebelum di shell harus seperti ini :
        ' cmd /c start chrome "http://web.lapilabs.co.id:8080/eMon/AutoLoginVb.aspx?UID=493&&DID=493&&TOKEN=4315da3dee6a488dea727f1c65600bbb&page=/emon/prod_list_produksi.aspx
        Shell a, vbMaximizedFocus
End Sub
