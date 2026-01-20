'2023-01-09
'modif 2022-08-23 sore
Dim XMouse As Long, YMouse As Long
Dim wrdobject As Word.Application
Dim sourcePath As String, destinationPath As String
Dim ftp_UID As String, ftp_PWD As String, ftp_URL As String, ftp_subFolder As String


Private Sub cbo_tahun_KeyPress(KeyAscii As Integer)
    KeyAscii = 0
End Sub

Private Sub cbo_tahun_KeyUp(KeyCode As Integer, Shift As Integer)
    If KeyCode = 8 Or KeyCode = 46 Then
        cbo_tahun.Text = ""
    End If
End Sub

Private Sub cmd_Approve_Click()

    If MsgBox(Pesan.Sure_To_Approve, vbQuestion + vbYesNo, "Approve") = vbNo Then Exit Sub
    If txt_No_permohonan.Text = "Auto" Then MsgBox "Harap pilih data yang akan di Approve!", vbCritical, "Approve": Exit Sub
    Dim sql As String, appr_IDent As String
    appr_IDent = fnApprIdentity(gstrUserName, 1)
    sql = " Insert into t_Kalibrasi_Status(No_Permohonan, Approver_No, isReject, Approver_Identity, Process_Date, User_ID, Delegated_To, flag_update) " & _
          " Values('" & txt_No_permohonan.Text & "', 1, 0, '" & appr_IDent & "', getdate(), '" & gstrUserName & "', '" & gstrDelegatedTo & "', null) "

    If Execute(sql) = True Then
        Call sb_Clear_head
        Frame3.Enabled = False
        Call sb_Clear_sub
        Call sb_Show_Grid
        sb_approve_button
        MsgBox Pesan.Data_Has_Been_Approved, vbInformation, "Succes Approve"
    Else
        MsgBox Pesan.Error_Executing_Command, vbCritical, vbDefault
    End If


End Sub

Private Sub cmd_Browse_File_Click()

    If fn_IS_approve() = True Then MsgBox "Data sudah approve, tidak bisa upload file!", vbCritical, vbDefault: Exit Sub

    f_GMP1_dlg.ShowOpen
    txt_file_Ori.Text = f_GMP1_dlg.filename
End Sub

Private Sub cmd_clear_File_Click()
    txt_file_Ori.Text = ""
    f_GMP1_dlg.filename = ""
End Sub

Private Sub cmd_Del_Click()
    If txt_No_permohonan.Text = "Auto" Or txt_No_permohonan.Text = "" Then MsgBox "Harap pilih data yang akan dihapus", vbCritical, "Cek data": Exit Sub
    If fn_IS_approve() = True Then MsgBox "Data sudah approve, tidak bisa dihapus!", vbCritical, vbDefault: Exit Sub
    If MsgBox(Pesan.Sure_To_Delete, vbQuestion + vbYesNo, "Sure to delete") = vbNo Then Exit Sub

    sql = "delete T_Kalibrasi_Permohonan where No_Permohonan = '" & txt_No_permohonan.Text & "' "

    If Execute(sql) = True Then
        Call sb_Clear_head
        Frame3.Enabled = False
        Call sb_Clear_sub
        Call sb_Show_Grid
        MsgBox Pesan.Data_Has_Been_Deleted, vbInformation, "Succes Delete"
    Else
        MsgBox Pesan.Error_Executing_Command, vbCritical, vbDefault
    End If


End Sub

Private Sub cmd_download_Click()


       '---###
    If txt_file_download.Text = "" Then
        MsgBox "File not found", vbCritical, Default_Message_Title
        Exit Sub
    End If
    '--######             '---#####
    f_GMP1_dlg.filename = txt_file_download.Text
    '--#####
    f_GMP1_dlg.ShowSave
                     '---####
    CheckFileExists (f_GMP1_dlg.filename)

    '1 START DOWNLOAD ###
    Dim Inet1 As Object
    Set Inet1 = CreateObject("InetCtls.Inet")


   Inet1.AccessType = icDirect
   Inet1.url = ftp_URL

   Inet1.username = ftp_UID
   Inet1.password = ftp_PWD

   Inet1.RequestTimeout = 3600
                '---#
   If InStr(1, f_GMP1_dlg.filename, "\") = 0 Then
        MsgBox "Fail download data", vbCritical, Default_Message_Title
        Exit Sub
   End If

   frm_Kal_Ser_Thermo_DA.MousePointer = 11

                                                         '--######                             '---######
   Inet1.Execute , "GET " & """" & ftp_subFolder & "/" & txt_file_download.Text & """" & " " & """" & f_GMP1_dlg.filename & """"

   Do While Inet1.StillExecuting
      DoEvents
   Loop

   Inet1.Execute , "CLOSE"
                                   '---###
   MsgBox ("Download Completed:" & f_GMP1_dlg.filename), vbInformation
   '---###
   f_GMP1_dlg.filename = ""

'   frame_Input.Enabled = True
   frm_Kal_Ser_Thermo_DA.MousePointer = 0


End Sub

Private Sub cmd_exit_Click()
    Unload Me
End Sub

Private Sub cmd_File_Click()
    If txt_file_download.Text = "" Then Exit Sub
    If fn_IS_approve() = True Then MsgBox "Data sudah approve, tidak bisa hapus file!", vbCritical, vbDefault: Exit Sub

    Dim sql As String
    If MsgBox("Sure to delete file ?", vbQuestion + vbYesNo, "Delete file") = vbNo Then Exit Sub
    sql = " update T_Kalibrasi_Permohonan set FILE_NAME  = '' where No_Permohonan = '" & txt_No_permohonan.Text & "' "
    If Execute(sql) = True Then

        MsgBox "File has been deleted", vbInformation, "Delete File"
        txt_file_download.Text = ""
        Call sbFill_FileDownload
    Else
        MsgBox Pesan.Error_Executing_Command, vbCritical, "Error"
    End If

End Sub

Private Sub cmd_New_Click()
    Call sb_Clear_head
    Call sb_approve_button
    Frame3.Enabled = False

    txt_No_permohonan.Text = "Auto"
    txt_Pemohon.Text = gstrUserName
    txt_bagian.Text = gstrDepartment
    txt_tanggal.Text = Format(Get_Date, "dd-MMM-yyyy")
    txt_Kategori.Enabled = True

    Call sb_Clear_sub
    Call sb_Show_Grid

End Sub

Sub sb_Clear_head()
    txt_Kategori.Text = ""
    txt_No_permohonan.Text = ""
    txt_Pemohon.Text = ""
    txt_bagian.Text = ""
    txt_tanggal.Text = ""
    txt_Rekalibrasi_QA_ID.Text = ""
    txt_ket_Rekalibrasi.Text = ""
    txt_ket_Rekalibrasi.Locked = True

End Sub

Sub sb_Clear_sub()
    txt_nama_mesin.Text = ""
    txt_No_identitas.Text = ""
    txt_alat_ukur.Text = ""
    txt_no_identitas_kalibrasi.Text = ""
    txt_merk.Text = ""
    txt_kapasitas.Text = ""
    txt_jumlah.Text = ""
    txt_fungsi.Text = ""
    txt_titik_pengukuran.Text = ""
    txt_Lokasi.Text = ""
    txt_tanggal_butuh.Text = ""
    txt_No_sertifikat.Text = ""

    txt_file_Ori.Text = ""
    txt_file_download.Text = ""

End Sub



Private Sub cmd_print_Click()
    Exit Sub
    If fn_IS_approve = False Then MsgBox "Tidak bisa cetak karena belum approve", vbCritical, "Belum approve"
    Call generate_Print
End Sub

Private Sub cmd_Save_Click()
    Dim sql As String, v_File_name As String

    If txt_Kategori.Text = "" Then
        MsgBox "Kategori Permohonan harus di isi", vbCritical, "Cek data"
        Exit Sub
    End If


    If txt_tanggal_butuh.Text = "" Then
        MsgBox "Tanggal butuh harus diisi", vbCritical, "Harap isi"
        txt_tanggal_butuh.SetFocus
        Exit Sub
    End If


    If txt_Kategori.Text = "Re-Kalibrasi" And txt_ket_Rekalibrasi.Text = "" Then
        MsgBox "Keterangan Re-Kalibrasi harus di isi!", vbCritical, "Isi keterangan re-kalibrasi"
        txt_ket_Rekalibrasi.SetFocus
        Exit Sub

    End If

    'cek file browse nya
    Dim v_ext As String
    v_File_name = ""



    'Mulai #save Insert new
    If txt_No_permohonan.Text = "Auto" Or txt_No_permohonan.Text = "" Then
        Dim strAutoNum As String, rs As Recordset
        Set rs = GetRecordset(" select dbo.fnGet_NO_Kal_mohon('" & gstrDepartment & "') as autoNum ")
        strAutoNum = "" & rs!AutoNum

        If txt_file_Ori.Text <> "" Then
            v_ext = fnGetExtentionFile()
            v_File_name = "" & Replace(strAutoNum, "/", "_") & "." & v_ext
        End If

      '#Upload File
            If txt_file_Ori.Text <> "" Then
                Frame5.Visible = True
                Frame5.Left = 3060
                Frame5.Top = 3000

                Frame4.Enabled = False
'                If fnUploadFile(txt_No_Permohonan.Text) = True Then
                If fnUploadFile(strAutoNum) = True Then
                    'msgbox "Sukses Upload file"
                Else
                    MsgBox "Error upload file", vbCritical, "Error"
                    Exit Sub
                End If

            End If '#end Upload File



        sql = " Insert into T_Kalibrasi_Permohonan(No_Permohonan, tanggal, kategori_permohonan,QA_ID_rekalibrasi,Ket_Rekalibrasi, pemohon, bagian, nama_instrumen, No_identitas_Istrumen, No_identitas_kalibrasi, Alat_ukur_kalibrasi, Merk, Kapasitas, Jumlah, fungsi, Titik_pengukuran, Lokasi, tgl_butuh, no_sertifikat_terakhir,Assm_nama_instrumen, Assm_No_identitas_Istrumen,Assm_No_identitas_kalibrasi, Assm_Alat_ukur_kalibrasi, Assm_Merk, Assm_Kapasitas, Assm_Lokasi,Titik_pengukuran_kalibrasi, Group_Da_Dept,FILE_NAME, UserID, Delegated_To, Process_date) " & _
                " values('" & strAutoNum & "', getdate(), '" & txt_Kategori.Text & "','" & txt_Rekalibrasi_QA_ID.Text & "','" & txt_ket_Rekalibrasi.Text & "', '" & gstrUserName & "', '" & gstrDepartment & "', '" & txt_nama_mesin.Text & "', '" & txt_No_identitas.Text & "', '" & txt_no_identitas_kalibrasi.Text & "', '" & txt_alat_ukur.Text & "', '" & txt_merk.Text & "', '" & txt_kapasitas.Text & "', '" & txt_jumlah.Text & "', '" & txt_fungsi.Text & "', '" & txt_titik_pengukuran.Text & "', '" & txt_Lokasi.Text & "', '" & Format(CDate(txt_tanggal_butuh.Text), "yyyy/MM/dd") & "', '" & txt_No_sertifikat.Text & "','" & txt_nama_mesin.Text & "', '" & txt_No_identitas.Text & "','" & txt_no_identitas_kalibrasi.Text & "', '" & txt_alat_ukur.Text & "', '" & txt_merk.Text & "', '" & txt_kapasitas.Text & "', '" & txt_Lokasi.Text & "','" & txt_titik_pengukuran.Text & "','" & gstrDepartment & "','" & v_File_name & "', '" & gstrUserName & "', '" & gstrDelegatedTo & "', getdate() ) "
        If Execute(sql) = True Then
            txt_No_permohonan.Text = strAutoNum
            Frame4.Enabled = True
            Frame5.Visible = False

            txt_Kategori.Enabled = False
            MsgBox Pesan.Has_Been_Saved, vbInformation, "Save"
            Call sbFill_FileDownload
            Call sb_Show_Grid
            Call sb_approve_button

        Else
            MsgBox Pesan.Error_Executing_Command, vbCritical
        End If

    Else 'Mulai #save UPDATE
        If fn_IS_approve() = True Then MsgBox "Data sudah approve, tidak bisa diupdate!", vbCritical, vbDefault: Exit Sub

        Dim strSQL_fileName As String
        If txt_file_Ori.Text <> "" Then
            v_ext = fnGetExtentionFile()
            v_File_name = "" & Replace(txt_No_permohonan.Text, "/", "_") & "." & v_ext
            strSQL_fileName = " FILE_NAME='" & v_File_name & "', "
        Else
            strSQL_fileName = ""
        End If
        Frame4.Enabled = False
        '#Upload File
            If txt_file_Ori.Text <> "" Then
                If fnUploadFile(txt_No_permohonan.Text) = True Then
                    Frame5.Visible = True
                    Frame5.Left = 3060
                    Frame5.Top = 3000

                    txt_file_Ori.Text = ""
                    MsgBox Pesan.Has_Been_Updated, vbInformation, "Update"
                    'Call sbFill_FileDownload
                    'msgbox "Sukses upload file"
                Else
                    MsgBox "Error upload file", vbCritical, "Error Upload"
                    Exit Sub
                End If
            End If '#end Upload File

        sql = " update T_Kalibrasi_Permohonan set QA_ID_rekalibrasi='" & txt_Rekalibrasi_QA_ID.Text & "', Ket_Rekalibrasi='" & txt_ket_Rekalibrasi.Text & "' , nama_instrumen='" & txt_nama_mesin.Text & "', No_identitas_Istrumen='" & txt_No_identitas.Text & "', No_identitas_kalibrasi='" & txt_no_identitas_kalibrasi.Text & "', Alat_ukur_kalibrasi='" & txt_alat_ukur.Text & "', Merk='" & txt_merk.Text & "', " & _
                      " Kapasitas='" & txt_kapasitas.Text & "', Jumlah='" & txt_jumlah.Text & "', fungsi='" & txt_fungsi.Text & "', Titik_pengukuran='" & txt_titik_pengukuran.Text & "', Lokasi='" & txt_Lokasi.Text & "', tgl_butuh='" & txt_tanggal_butuh.Text & "', no_sertifikat_terakhir='" & txt_No_sertifikat.Text & "',Assm_nama_instrumen='" & txt_nama_mesin.Text & "', Assm_No_identitas_Istrumen='" & txt_No_identitas.Text & "',Assm_No_identitas_kalibrasi='" & txt_no_identitas_kalibrasi.Text & "', Assm_Alat_ukur_kalibrasi='" & txt_alat_ukur.Text & "', Assm_Merk='" & txt_merk.Text & "', Assm_Kapasitas='" & txt_kapasitas.Text & "', Assm_Lokasi='" & txt_Lokasi.Text & "',Titik_pengukuran_kalibrasi='" & txt_titik_pengukuran.Text & "'," & strSQL_fileName & " UserID='" & gstrUserName & "', Delegated_To='" & gstrDelegatedTo & "', Process_date=getdate() " & _
                      " where No_Permohonan = '" & txt_No_permohonan.Text & "' "

        If Execute(sql) = True Then

            If txt_file_Ori.Text <> "" Then
                txt_file_Ori.Text = ""
            End If '#end Upload File
            Frame4.Enabled = True
            Frame5.Visible = False

            MsgBox Pesan.Has_Been_Updated, vbInformation, "Update"
            Call sbFill_FileDownload
            Call sb_Show_Grid
            txt_Kategori.Enabled = False

            Call sb_approve_button
        Else
            MsgBox Pesan.Error_Executing_Command, vbCritical
        End If

    End If


End Sub

Private Sub cmdCari_Nama_Click()

Dim strSQL As String

strQuickSearch = Trim(InputBox("Ketik Kode QA atau Nama Mesin/Instrumen : ", "Filter", ""))

gStrListerTag = " QA ID, Nama Mesin/Instrumen, No Identitas Istrumen, No Identitas Kalibrasi, Group Da Dept, Kapasitas, Parameter Kalibrasi, Lokasi "

'strSQL = " SELECT     QA_ID, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi, Assm_Lokasi " & _
'              " FROM T_Kalibrasi_DA_Thermohygro  where (QA_ID like '%" & strQuickSearch & "%' or Assm_nama_instrumen like '%" & strQuickSearch & "%' or Assm_No_identitas_Istrumen like '%" & strQuickSearch & "%' or Assm_No_identitas_kalibrasi like '%" & strQuickSearch & "%'  ) order by 1 "

strSQL = " select * from ( " & _
                " SELECT   distinct  QA_ID, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi, Assm_Lokasi  " & _
                               " From T_Kalibrasi_DA_Thermohygro  " & _
                " Union All  " & _
                " SELECT   distinct  QA_ID, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi, Assm_Lokasi  " & _
                               " FROM T_Kalibrasi_DA_Anak_Timbangan " & _
                " Union All  " & _
                " SELECT   distinct  QA_ID, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi, Assm_Lokasi   " & _
                               " From T_Kalibrasi_DA_Timbangan" & _
                " union all " & _
                " SELECT   distinct  QA_ID, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi, Assm_Lokasi   " & _
                               " From T_Kalibrasi_DA_Bagian  )  as A " & _
                " where (QA_ID like '%" & strQuickSearch & "%' or Assm_nama_instrumen like '%" & strQuickSearch & "%' or Assm_No_identitas_Istrumen like '%" & strQuickSearch & "%' or Assm_No_identitas_kalibrasi like '%" & strQuickSearch & "%'  ) order by 1 "


Set grecLister = GetRecordset(strSQL)

    If Not grecLister.EOF Then

    frmLister.Caption = "Pilih Data DA eKalibrasi"
    frmLister.Show 1
            If gStrListerTag <> "" Then

            With frmLister.lvwLister.SelectedItem


                txt_Rekalibrasi_QA_ID.Text = "" & .Text
                txt_nama_mesin.Text = "" & .ListSubItems(1)
                txt_No_identitas.Text = "" & .ListSubItems(2)
                txt_no_identitas_kalibrasi.Text = "" & .ListSubItems(3)
                txt_alat_ukur.Text = "" & .ListSubItems(1)
                txt_Lokasi.Text = "" & .ListSubItems(7)





            End With

            Unload frmLister


            End If
    Else
        MsgBox "Data Not Found !", vbCritical, Me.Caption
    End If
End Sub



Private Sub DTPicker1_CloseUp()
    txt_tanggal_butuh.Text = Format(CDate(DTPicker1.value), "dd-MMM-yyyy")
End Sub



Sub sbSet_Detail()
    Call sb_Clear_sub
    Frame3.Enabled = True
    If txt_Kategori.Text = "Alat Baru" Then '#Alat baru
        cmdCari_Nama.Enabled = False
        txt_nama_mesin.Locked = False

        txt_No_identitas.Locked = False
        txt_alat_ukur.Locked = False
        txt_no_identitas_kalibrasi.Locked = False
        txt_merk.Locked = False
        txt_kapasitas.Locked = False
         txt_jumlah.Locked = False
        txt_fungsi.Locked = False
        txt_titik_pengukuran.Locked = False
        txt_Lokasi.Locked = False
'        txt_tanggal_butuh.Locked = False
        txt_No_sertifikat.Locked = False
        txt_ket_Rekalibrasi.Locked = True

    Else '#Re-Kalibrasi
        cmdCari_Nama.Enabled = True
        txt_nama_mesin.Locked = True
        txt_No_identitas.Locked = True
        txt_alat_ukur.Locked = True
        txt_no_identitas_kalibrasi.Locked = True
        txt_merk.Locked = False
        txt_kapasitas.Locked = False

        txt_jumlah.Locked = False
        txt_fungsi.Locked = False
        txt_titik_pengukuran.Locked = False

        txt_Lokasi.Locked = False
        'txt_tanggal_butuh.Locked = True
        txt_No_sertifikat.Locked = False
        txt_ket_Rekalibrasi.Locked = False
    End If
End Sub








Private Sub Form_Load()

'ftp lama
'ftp_UID = "webattach"
'ftp_PWD = "web220714"

'ftp baru Des 2024
ftp_UID = "webattachnew"
ftp_PWD = "Web221124**"

'ftp_URL = "ftp://192.168.1.159"
'ftp_URL = "ftp://10.162.0.179"
ftp_URL = "ftp://web.lapilabs.co.id"
ftp_subFolder = "eKalibrasi"


    DTPicker1.value = CDate(Get_Date)
    'Call sb_Cek_button_Approve
    Call cmd_New_Click

    cbo_tahun.Text = Year(Get_Date)
    For I = 2021 To Year(Get_Date) + 1
        cbo_tahun.AddItem I
    Next I
    Call sb_Show_Grid

End Sub



Private Sub grid_Head_ColumnClick(ByVal ColumnHeader As MSComctlLib.ColumnHeader)
 With grid_Head
        If .SortKey <> ColumnHeader.Index - 1 Then
            .SortKey = ColumnHeader.Index - 1
            .SortOrder = lvwAscending
        Else
            If .SortOrder = lvwAscending Then
                .SortOrder = lvwDescending
             Else
                 .SortOrder = lvwAscending
            End If
        End If
        .Sorted = -1
    End With
End Sub

Private Sub grid_Head_DblClick()
    If grid_Head.ListItems.Count = 0 Then Exit Sub

    Call sb_Clear_head
    Frame3.Enabled = False
    Call sb_Clear_sub

    Frame3.Enabled = True



    With grid_Head
        'Header#

            txt_No_permohonan.Text = "" & .SelectedItem.Text

            Dim rs As Recordset, sql As String
            sql = "SELECT      pemohon, bagian,tanggal, kategori_permohonan, QA_ID_rekalibrasi, Ket_Rekalibrasi, nama_instrumen, No_identitas_Istrumen, No_identitas_kalibrasi, Alat_ukur_kalibrasi, Merk, " & _
                                                  " Kapasitas , Jumlah, fungsi, Titik_pengukuran, Lokasi, tgl_butuh, no_sertifikat_terakhir  " & _
                            " From T_Kalibrasi_Permohonan  " & _
                            " where No_Permohonan ='" & txt_No_permohonan.Text & "'  "
            Set rs = GetRecordset(sql)

            txt_Pemohon.Text = "" & rs!pemohon
            txt_bagian.Text = "" & rs!bagian
            txt_tanggal.Text = "" & Format(CDate(rs!Tanggal), "dd-MMM-yyyy")
            txt_Kategori.Text = "" & rs!kategori_permohonan
            Call sbSet_Detail
            txt_Kategori.Enabled = False
       'Detail#
            txt_Rekalibrasi_QA_ID.Text = "" & rs!QA_ID_Rekalibrasi
            txt_nama_mesin.Text = "" & rs!nama_instrumen
            txt_No_identitas.Text = "" & rs!No_identitas_Istrumen
            txt_alat_ukur.Text = "" & rs!Alat_ukur_kalibrasi
            txt_no_identitas_kalibrasi.Text = "" & rs!No_identitas_kalibrasi
            txt_ket_Rekalibrasi.Text = "" & rs!Ket_Rekalibrasi
            txt_merk.Text = "" & rs!Merk
            txt_kapasitas.Text = "" & rs!Kapasitas
            txt_jumlah.Text = "" & rs!Jumlah
            txt_fungsi.Text = "" & rs!fungsi
            txt_titik_pengukuran.Text = "" & rs!Titik_pengukuran
            txt_Lokasi.Text = "" & rs!Lokasi
            txt_tanggal_butuh.Text = "" & Format(rs!tgl_butuh, "dd-MMM-yyyy")
            txt_No_sertifikat.Text = "" & rs!no_sertifikat_terakhir
            Call sb_approve_button
        'File Name Download
            Call sbFill_FileDownload

    End With
End Sub

Private Sub txt_Kategori_Click()
    Call sbSet_Detail
    If txt_Kategori.Text = "Alat Baru" Then
        txt_ket_Rekalibrasi.Text = ""
    End If

End Sub

Private Sub txt_Kategori_DragOver(Source As Control, x As Single, y As Single, State As Integer)
        'not work
End Sub



Private Sub txt_Kategori_KeyPress(KeyAscii As Integer)
    KeyAscii = 0
End Sub





Private Sub txt_no_identitas_kalibrasi_KeyPress(KeyAscii As Integer)
     KeyAscii = Asc(UCase(Chr(KeyAscii)))
End Sub

Private Sub txt_No_identitas_KeyPress(KeyAscii As Integer)
 KeyAscii = Asc(UCase(Chr(KeyAscii)))
End Sub

Private Sub txt_tanggal_butuh_KeyUp(KeyCode As Integer, Shift As Integer)

    If KeyCode = 8 Or KeyCode = 46 Then
        txt_tanggal_butuh.Text = ""
    End If
End Sub


Function fnGetKategori() As Integer

End Function



Sub sb_Show_Grid()

grid_Head.ListItems.Clear
Dim recTemp As Recordset
Dim varTemp As String

varTemp = "SELECT     A.No_Permohonan, pemohon, bagian, CONVERT(varchar(20),tanggal,13) as tanggal, kategori_permohonan,  nama_instrumen, No_identitas_Istrumen, No_identitas_kalibrasi, Alat_ukur_kalibrasi, Merk,  Kapasitas , Jumlah, fungsi, Titik_pengukuran, Lokasi, tgl_butuh, no_sertifikat_terakhir, dbo.fnGetNamaKaryawan(B.USER_ID) as Approver_Identity, CONVERT(varchar(20),B.Process_Date,13) as Process_Date,dbo.fnGetNamaKaryawan(C.USER_ID) as Approver_MgrQA, CONVERT(varchar(20),C.Process_Date,13) as Approver_MgrQADate, A.QA_ID, A.ID_No_Sertifikat " & _
                                " From T_Kalibrasi_Permohonan  as A  left join (select * from t_Kalibrasi_Status where Approver_No = 1) as B on A.No_Permohonan = B.No_Permohonan " & _
                                " left join (select * from t_Kalibrasi_Status where Approver_No = 2) as C on A.No_Permohonan = C.No_Permohonan   " & _
                                " where year(tanggal) like '%" & cbo_tahun.Text & "%'  and  1=1 "
If gstrDepartment <> "VN" Then
    varTemp = varTemp & " and bagian = '" & gstrDepartment & "' "
End If
varTemp = varTemp & " ORDER BY A.tanggal DESC "


Set recTemp = GetRecordset(varTemp)
    If Not recTemp.EOF Then
        For I = 0 To recTemp.RecordCount - 1
            Set li = grid_Head.ListItems.Add(, , "" & recTemp!no_permohonan)
                'Show header
                li.SubItems(1) = "" & recTemp!pemohon
                li.SubItems(2) = "" & recTemp!bagian
                li.SubItems(3) = "" & recTemp!Tanggal
                li.SubItems(4) = "" & recTemp!kategori_permohonan
                'show detail
                li.SubItems(5) = "" & recTemp!nama_instrumen
                li.SubItems(6) = "" & recTemp!No_identitas_Istrumen
                li.SubItems(7) = "" & recTemp!No_identitas_kalibrasi
                li.SubItems(8) = "" & recTemp!Alat_ukur_kalibrasi
                li.SubItems(9) = "" & recTemp!Merk
                li.SubItems(10) = "" & recTemp!Kapasitas
                li.SubItems(11) = "" & recTemp!Jumlah
                li.SubItems(12) = "" & recTemp!fungsi
                li.SubItems(13) = "" & recTemp!Titik_pengukuran
                li.SubItems(14) = "" & recTemp!Lokasi
                li.SubItems(15) = "" & Format(CDate(recTemp!tgl_butuh), "dd-MMM-yyyy")
                li.SubItems(16) = "" & recTemp!no_sertifikat_terakhir

                li.SubItems(17) = "" & recTemp!Approver_Identity
                li.SubItems(18) = "" & recTemp!process_date

                li.SubItems(19) = "" & recTemp!Approver_MgrQA
                li.SubItems(20) = "" & recTemp!Approver_MgrQADate

                li.SubItems(21) = "" & recTemp!QA_ID
                li.SubItems(22) = "" & recTemp!ID_No_Sertifikat




                recTemp.MoveNext
        Next I
    End If
End Sub

'Sub sb_Cek_button_Approve()
'    '
'    Dim rs As Recordset, sql As String
'    sql = "select * from m_approver_lines where Appr_ApplicationCode = 'Kal_permohonan' and Appr_No = 1 and Appr_ID = '" & gstrUserName & "'"
'    Set rs = GetRecordset(sql)
'    If rs.RecordCount > 0 Then
'        cmd_approve.Visible = True
'    Else
'        cmd_approve.Visible = False
'    End If
'
'End Sub

Sub sb_approve_button()
    cmd_Approve.Enabled = False
    If txt_No_permohonan.Text = "Auto" Or txt_No_permohonan.Text = "" Then
        cmd_Approve.Enabled = False
        cmd_Print.Enabled = False
        Exit Sub
    End If

    Dim rs As Recordset, sql As String, strAllow As Boolean

    '1#-----------------
    strAllow = False
    sql = "select * from m_approver_lines where isactive = 1 and Appr_ApplicationCode = 'Kal_permohonan' and Appr_No = 1 and Appr_ID = '" & gstrUserName & "' and Appr_DeptID = '" & txt_bagian.Text & "' "
    Set rs = GetRecordset(sql)

    If rs.RecordCount > 0 Then
        strAllow = True
    Else
        strAllow = False
    End If

    '#2-----------------BUTTON APPROVE SAJA
    sql = "select COUNT(*) as JumRow from [t_Kalibrasi_Status] where no_permohonan = '" & txt_No_permohonan.Text & "' and approver_no = 1 "
    Set rs = GetRecordset(sql)
    If val(rs!jumRow) = 0 And strAllow = True Then
        cmd_Approve.Enabled = True

    Else
        cmd_Approve.Enabled = False

    End If
    '#3 BUAT BUTTON PRINT SAJA
    If fn_IS_approve = True Then
        cmd_Print.Enabled = True
    Else
        cmd_Print.Enabled = False
    End If

End Sub


Function fn_IS_approve() As Boolean
    If txt_No_permohonan.Text = "Auto" Or txt_No_permohonan.Text = "" Then
        fn_IS_approve = False
        Exit Function
    End If

    Dim rs As Recordset, sql As String
        sql = "select * from [t_Kalibrasi_Status] where No_Permohonan = '" & txt_No_permohonan.Text & "' and Approver_No = 1"
    Set rs = GetRecordset(sql)
    If rs.RecordCount = 0 Then
         fn_IS_approve = False
    Else
         fn_IS_approve = True
    End If

End Function


Private Sub copyTemplate(ByVal filename As String)
    On Error GoTo Pesan
    Dim oShell
    Set oShell = CreateObject("WScript.Shell")
    oShell.Run "cmd.exe /c net use \\app.lapilabs.co.id\erp /user:erp erp"

    sourcePath = "\\app.lapilabs.co.id\erp\DA QA\"
    'sourcePath = "D:\Kalibrasi_DOC\"

    destinationPath = app.path & "\"
    FileCopy sourcePath & filename, destinationPath & filename
    Exit Sub
Pesan:
    MsgBox "Harap tutup file word template!", vbCritical, "Cek kembali, pastikan data tidak terbuka"

End Sub





 Private Sub generate_Print()

    Dim TabelContent As Bookmark
    Dim s As Selection
    Dim file As String
    Dim path As String
    On Error Resume Next

    Dim Adodc1 As Recordset

    Set wrdobject = GetObject(, "Word.Application")
    If Err.NUMBER > 0 Then Set wrdobject = CreateObject("Word.Application")
    On Error GoTo 0

    Dim rs As Recordset, sql As String

    file = "FO.QA.000125_Permohonan.doc"

    If 1 = 1 Then
        copyTemplate filename:=file
        path = destinationPath
        wrdobject.Documents.Open (path & file)
    Else
        Exit Sub
    End If

        wrdobject.Visible = True


        '****************DOCUMENT BOOKMARKS

        Dim BBtxt_01_bagian As Bookmark
        Dim BBtxt_02_Pemohon As Bookmark
        Dim BBtxt_03_No_permohonan As Bookmark
        Dim BBtxt_04_Nama_mesin As Bookmark
        Dim BBtxt_05_No_ID_mesin As Bookmark
        Dim BBtxt_06_Alat_ukur_yg As Bookmark
        Dim BBtxt_07_Merk_type As Bookmark
        Dim BBtxt_08_Kapasitas_Resolusi As Bookmark
        Dim BBtxt_09_Jumlah As Bookmark
        Dim BBtxt_10_Fungsi_tujuan As Bookmark
        Dim BBtxt_11_Titik_pengukuran As Bookmark
        Dim BBtxt_12_Lokasi As Bookmark
        Dim BBtxt_13_Tgl_Dibutuhkan As Bookmark
        Dim BBtxt_14A_chk_Kalibrasi_alat As Bookmark
        Dim BBtxt_14B_chk_Rekalibrasi As Bookmark
        Dim BBtxt_16_Ket_Rekalibrasi As Bookmark
        Dim BBtxt_17A_Sertifikat_kalibrasi_Ada As Bookmark
        Dim BBtxt_17B_Sertifikat_kalibrasi_Tidak As Bookmark
        Dim BBtxt_18_Nama_Alat_ukur As Bookmark
        Dim BBtxt_19_ID_kalibrasi As Bookmark
        Dim BBtxt_20_rencana_eksekusi As Bookmark
        Dim BBtxt_21A_Jenis_kalibrasi As Bookmark
        Dim BBtxt_21B_Jenis_kalibrasi As Bookmark
        Dim BBtxt_22A_Sub_jenis_kal As Bookmark
        Dim BBtxt_22B_Sub_jenis_kal As Bookmark
        Dim BBtxt_22C_Sub_jenis_kal As Bookmark
        Dim BBtxt_23A_Prog_Verifikasi As Bookmark
        Dim BBtxt_23B_Prog_Verifikasi As Bookmark
        Dim BBtxt_24_Titik_pengukuran As Bookmark
        Dim BBtxt_25_Keterangan As Bookmark
        Dim BBtxt_26_TTd_Mgr_bagian As Bookmark

        Dim BBtxt_27_TTd_Pemohon01 As Bookmark
        Dim BBtxt_27_TTd_Pemohon02 As Bookmark
        Dim BBtxt_27_TTd_Pemohon03 As Bookmark

        Dim BBtxt_28_TTd_Mgr_Dept01  As Bookmark
        Dim BBtxt_28_TTd_Mgr_Dept02  As Bookmark
        Dim BBtxt_28_TTd_Mgr_Dept03 As Bookmark

        Dim BBtxt_29_TTd_Mgr_QA01  As Bookmark
        Dim BBtxt_29_TTd_Mgr_QA02  As Bookmark
        Dim BBtxt_29_TTd_Mgr_QA03  As Bookmark




'        SQL = " SELECT  bagian, " & _
'                        " pemohon,  " & _
'                        " No_Permohonan,  " & _
'                        " nama_instrumen,  No_identitas_kalibrasi,  " & _
'                        " Alat_ukur_kalibrasi,  " & _
'                        " Merk,  " & _
'                        " Kapasitas,  " & _
'                        " Jumlah,  " & _
'                        " fungsi,  " & _
'                        " Titik_pengukuran,  " & _
'                        " Lokasi,  " & _
'                        " REPLACE(CONVERT(CHAR(11), cast(tgl_butuh as datetime), 106),' ','-') as tgl_butuh,  " & _
'                        " kategori_permohonan, " & _
'                        " Ket_Rekalibrasi,  " & _
'                        " isnull(no_sertifikat_terakhir,'') as no_sertifikat_terakhir, " & _
'                        " Assm_nama_instrumen, " & _
'                        " Assm_No_identitas_kalibrasi,  " & _
'                        " REPLACE(CONVERT(CHAR(11), cast(RENCANA_EKSEKUSI as datetime), 106),' ','-')  as RENCANA_EKSEKUSI,  " & _
'                        " Jenis_kalibrasi,  " & _
'                        " Jenis_External,  " & _
'                        " Program_verifikasi,  " & _
'                        " Titik_pengukuran_kalibrasi,  " & _
'                        " Keterangan ,CONVERT(varchar(20), tanggal, 13)  as Pemohon_Date  " & _
'                " From T_Kalibrasi_Permohonan  " & _
'                " WHERE     (No_Permohonan = '" & txt_No_Permohonan.Text & "') "

sql = "  SELECT  A.bagian, " & _
                "A.pemohon, " & _
                "A.No_Permohonan," & _
                "A.nama_instrumen, A.No_identitas_kalibrasi," & _
                "A.Alat_ukur_kalibrasi," & _
                "A.Merk," & _
                "A.Kapasitas," & _
                "A.Jumlah," & _
                "A.fungsi," & _
                "A.Titik_pengukuran," & _
                "A.Lokasi," & _
                "REPLACE(CONVERT(CHAR(11), cast(A.tgl_butuh as datetime), 106),' ','-') as tgl_butuh," & _
                "A.kategori_permohonan," & _
                "A.Ket_Rekalibrasi," & _
                "isnull(A.no_sertifikat_terakhir,'') as no_sertifikat_terakhir," & _
                "A.Assm_nama_instrumen," & _
                "A.Assm_No_identitas_kalibrasi," & _
                "REPLACE(CONVERT(CHAR(11), cast(A.RENCANA_EKSEKUSI as datetime), 106),' ','-')  as RENCANA_EKSEKUSI," & _
                "A.Jenis_kalibrasi," & _
                "A.Jenis_External," & _
                "A.Program_verifikasi," & _
                "A.Titik_pengukuran_kalibrasi," & _
                "A.Keterangan" & _
                " , CONVERT(varchar(20), A.tanggal, 13)  as Pemohon_Date "
    sql = sql & " , case when B.MgrDept_UID = B.MgrDept_Delegate then 'Approved By: ' + dbo.fnGetNamaKaryawan(B.MgrDept_UID) else dbo.fnGetNamaKaryawan(B.MgrDept_Delegate) end as Mgr_Dept_UID " & _
                 " , case when B.MgrDept_UID = B.MgrDept_Delegate then ' ' else 'Delegated to: ' + dbo.fnGetNamaKaryawan(B.MgrDept_UID) end as Mgr_Dept_Delegated " & _
                 " , CONVERT(varchar(20), B.MgrDept_date, 13)  as Mgr_Dept_Date " & _
                 " , case when C.MgrQA_UID = C.MgrQA_Delegate then 'Approved By: ' + dbo.fnGetNamaKaryawan(C.MgrQA_UID) else dbo.fnGetNamaKaryawan(C.MgrQA_Delegate) end as Mgr_QA_UID " & _
                 " , case when C.MgrQA_UID = C.MgrQA_Delegate then ' ' else 'Delegated to: ' + dbo.fnGetNamaKaryawan(C.MgrQA_UID) end as Mgr_QA_Delegated " & _
                 " , CONVERT(varchar(20), C.MgrQA_date, 13)  as Mgr_QA_Date " & _
        "FROM         T_Kalibrasi_Permohonan as A " & _
                        " left join (select No_Permohonan, USER_ID as MgrDept_UID, Delegated_To as MgrDept_Delegate, Process_Date as MgrDept_date from T_Kalibrasi_status where Approver_No = 1 ) as B " & _
                          " on A.No_Permohonan =B.No_Permohonan " & _
                          " left join (select No_Permohonan, USER_ID as MgrQA_UID, Delegated_To as MgrQA_Delegate, Process_Date as MgrQA_date from T_Kalibrasi_status where Approver_No = 2 ) as C " & _
                          " on A.No_Permohonan =C.No_Permohonan " & _
        " WHERE     (A.No_Permohonan = '" & txt_No_permohonan.Text & "') "


        Set rs = GetRecordset(sql)


        '#01 Bagian
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_01_bagian") = True Then
            Set BBtxt_01_bagian = wrdobject.ActiveDocument.Bookmarks("txt_01_bagian")
            BBtxt_01_bagian.Range.Select
            wrdobject.Selection.TypeText Text:="" & rs!bagian
        End If
        '#02 Pemohon
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_02_Pemohon") = True Then
            Set BBtxt_02_Pemohon = wrdobject.ActiveDocument.Bookmarks("txt_02_Pemohon")
            BBtxt_02_Pemohon.Range.Select
            wrdobject.Selection.TypeText Text:=Get_EmployeeName("" & rs!pemohon)
        End If

        '#03 No. Permohonan
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_03_No_permohonan") = True Then
            Set BBtxt_03_No_permohonan = wrdobject.ActiveDocument.Bookmarks("txt_03_No_permohonan")
            BBtxt_03_No_permohonan.Range.Select
            wrdobject.Selection.TypeText Text:="" & rs!no_permohonan
        End If

        '#04 nama mesin/instrumen
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_04_Nama_mesin") = True Then
            Set BBtxt_04_Nama_mesin = wrdobject.ActiveDocument.Bookmarks("txt_04_Nama_mesin")
            BBtxt_04_Nama_mesin.Range.Select
            wrdobject.Selection.TypeText Text:="" & rs!nama_instrumen
        End If

        '#05 No ID mesin
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_05_No_ID_mesin") = True Then
            Set BBtxt_05_No_ID_mesin = wrdobject.ActiveDocument.Bookmarks("txt_05_No_ID_mesin")
            BBtxt_05_No_ID_mesin.Range.Select
            wrdobject.Selection.TypeText Text:="" & rs!No_identitas_kalibrasi
        End If

        '#06 alat ukur yang di akalibrasi
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_06_Alat_ukur_yg") = True Then
            Set BBtxt_06_Alat_ukur_yg = wrdobject.ActiveDocument.Bookmarks("txt_06_Alat_ukur_yg")
            BBtxt_06_Alat_ukur_yg.Range.Select
            wrdobject.Selection.TypeText Text:="" & rs!Alat_ukur_kalibrasi
        End If

        '#07 Merk/tipe
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_07_Merk_type") = True Then
            Set BBtxt_07_Merk_type = wrdobject.ActiveDocument.Bookmarks("txt_07_Merk_type")
            BBtxt_07_Merk_type.Range.Select
            wrdobject.Selection.TypeText Text:="" & rs!Merk
        End If

        '#08 kapasitas / resolusi
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_08_Kapasitas_Resolusi") = True Then
            Set BBtxt_08_Kapasitas_Resolusi = wrdobject.ActiveDocument.Bookmarks("txt_08_Kapasitas_Resolusi")
            BBtxt_08_Kapasitas_Resolusi.Range.Select
            wrdobject.Selection.TypeText Text:="" & rs!Kapasitas
        End If

        '#09 Jumlah
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_09_Jumlah") = True Then
            Set BBtxt_09_Jumlah = wrdobject.ActiveDocument.Bookmarks("txt_09_Jumlah")
            BBtxt_09_Jumlah.Range.Select
            wrdobject.Selection.TypeText Text:="" & rs!Jumlah
        End If

        '#10 fungsi tujuan
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_10_Fungsi_tujuan") = True Then
            Set BBtxt_10_Fungsi_tujuan = wrdobject.ActiveDocument.Bookmarks("txt_10_Fungsi_tujuan")
            BBtxt_10_Fungsi_tujuan.Range.Select
            wrdobject.Selection.TypeText Text:="" & rs!fungsi
        End If


        '#11 titik pengukuran
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_11_Titik_pengukuran") = True Then
            Set BBtxt_11_Titik_pengukuran = wrdobject.ActiveDocument.Bookmarks("txt_11_Titik_pengukuran")
            BBtxt_11_Titik_pengukuran.Range.Select
            wrdobject.Selection.TypeText Text:="" & rs!Titik_pengukuran
        End If

        '#12 Lokasi
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_12_Lokasi") = True Then
            Set BBtxt_12_Lokasi = wrdobject.ActiveDocument.Bookmarks("txt_12_Lokasi")
            BBtxt_12_Lokasi.Range.Select
            wrdobject.Selection.TypeText Text:="" & rs!Lokasi
        End If

        '13 #tgl dibutuhkan
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_13_Tgl_Dibutuhkan") = True Then
            Set BBtxt_13_Tgl_Dibutuhkan = wrdobject.ActiveDocument.Bookmarks("txt_13_Tgl_Dibutuhkan")
            BBtxt_13_Tgl_Dibutuhkan.Range.Select
            wrdobject.Selection.TypeText Text:="" & rs!tgl_butuh
        End If

        '14# Kategori permohonan
        If rs!kategori_permohonan = "Alat Baru" Then
            Set BBtxt_14A_chk_Kalibrasi_alat = wrdobject.ActiveDocument.Bookmarks("txt_14A_chk_Kalibrasi_alat")
            BBtxt_14A_chk_Kalibrasi_alat.Range.Select
            wrdobject.Selection.TypeText Text:=Chr(254)
        Else
            Set BBtxt_14B_chk_Rekalibrasi = wrdobject.ActiveDocument.Bookmarks("txt_14B_chk_Rekalibrasi")
            BBtxt_14B_chk_Rekalibrasi.Range.Select
            wrdobject.Selection.TypeText Text:=Chr(254)
        End If

         '16 #Keterangan re-kalibrasi
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_16_Ket_Rekalibrasi") = True Then
            Set BBtxt_16_Ket_Rekalibrasi = wrdobject.ActiveDocument.Bookmarks("txt_16_Ket_Rekalibrasi")
            BBtxt_16_Ket_Rekalibrasi.Range.Select
            wrdobject.Selection.TypeText Text:="" & rs!Ket_Rekalibrasi
        End If

        '17# sertifikat kalibrasi
        If rs!no_sertifikat_terakhir = "" Or rs!no_sertifikat_terakhir = "-" Then
            Set BBtxt_17B_Sertifikat_kalibrasi_Tidak = wrdobject.ActiveDocument.Bookmarks("txt_17B_Sertifikat_kalibrasi_Tidak")
            BBtxt_17B_Sertifikat_kalibrasi_Tidak.Range.Select
            wrdobject.Selection.TypeText Text:=Chr(254)
        Else
            Set BBtxt_17A_Sertifikat_kalibrasi_Ada = wrdobject.ActiveDocument.Bookmarks("txt_17A_Sertifikat_kalibrasi_Ada")
            BBtxt_17A_Sertifikat_kalibrasi_Ada.Range.Select
            wrdobject.Selection.TypeText Text:=Chr(254)
        End If

         '18 #Nama Alat Ukur
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_18_Nama_Alat_ukur") = True Then
            Set BBtxt_18_Nama_Alat_ukur = wrdobject.ActiveDocument.Bookmarks("txt_18_Nama_Alat_ukur")
            BBtxt_18_Nama_Alat_ukur.Range.Select
            wrdobject.Selection.TypeText Text:="" & rs!Assm_nama_instrumen
        End If

         '19 #ID kalibrasi
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_19_ID_kalibrasi") = True Then
            Set BBtxt_19_ID_kalibrasi = wrdobject.ActiveDocument.Bookmarks("txt_19_ID_kalibrasi")
            BBtxt_19_ID_kalibrasi.Range.Select
            wrdobject.Selection.TypeText Text:="" & rs!Assm_No_identitas_kalibrasi
        End If

         '20 #Rencana Eksekusi
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_20_rencana_eksekusi") = True Then
            Set BBtxt_20_rencana_eksekusi = wrdobject.ActiveDocument.Bookmarks("txt_20_rencana_eksekusi")
            BBtxt_20_rencana_eksekusi.Range.Select
            wrdobject.Selection.TypeText Text:="" & rs!RENCANA_EKSEKUSI
        End If



         '21# Jenis kalibrasi
        If rs!Jenis_kalibrasi = "1" Then 'Jika 1 Internal
            Set BBtxt_21A_Jenis_kalibrasi = wrdobject.ActiveDocument.Bookmarks("txt_21A_Jenis_kalibrasi")
            BBtxt_21A_Jenis_kalibrasi.Range.Select
            wrdobject.Selection.TypeText Text:=Chr(254)
        ElseIf rs!Jenis_kalibrasi = "2" Then 'Jika 2 External
            Set BBtxt_21B_Jenis_kalibrasi = wrdobject.ActiveDocument.Bookmarks("txt_21B_Jenis_kalibrasi")
            BBtxt_21B_Jenis_kalibrasi.Range.Select
            wrdobject.Selection.TypeText Text:=Chr(254)
        End If


        '22# sub External
        If rs!Jenis_External = "Insitu" Then 'Jika Insitu
            Set BBtxt_22A_Sub_jenis_kal = wrdobject.ActiveDocument.Bookmarks("txt_22A_Sub_jenis_kal")
            BBtxt_22A_Sub_jenis_kal.Range.Select
            wrdobject.Selection.TypeText Text:=Chr(254)
        ElseIf rs!Jenis_External = "Eksitu" Then 'Jika Eksitu
            Set BBtxt_22B_Sub_jenis_kal = wrdobject.ActiveDocument.Bookmarks("txt_22B_Sub_jenis_kal")
            BBtxt_22B_Sub_jenis_kal.Range.Select
            wrdobject.Selection.TypeText Text:=Chr(254)
        ElseIf rs!Jenis_External = "Kontrak Suplier" Then 'Jika Kontrak Suplier
            Set BBtxt_22C_Sub_jenis_kal = wrdobject.ActiveDocument.Bookmarks("txt_22C_Sub_jenis_kal")
            BBtxt_22C_Sub_jenis_kal.Range.Select
            wrdobject.Selection.TypeText Text:=Chr(254)
        End If


          '23# Program Verifikasi
        If rs!Program_verifikasi = "1" Then 'Jika 1 Ya
            Set BBtxt_23A_Prog_Verifikasi = wrdobject.ActiveDocument.Bookmarks("txt_23A_Prog_Verifikasi")
            BBtxt_23A_Prog_Verifikasi.Range.Select
            wrdobject.Selection.TypeText Text:=Chr(254)
        ElseIf rs!Jenis_kalibrasi = "2" Then 'Jika 2 tidak
            Set BBtxt_23B_Prog_Verifikasi = wrdobject.ActiveDocument.Bookmarks("txt_23B_Prog_Verifikasi")
            BBtxt_23B_Prog_Verifikasi.Range.Select
            wrdobject.Selection.TypeText Text:=Chr(254)
        End If


          '24 #Titik Pengukuran
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_24_Titik_pengukuran") = True Then
            Set BBtxt_24_Titik_pengukuran = wrdobject.ActiveDocument.Bookmarks("txt_24_Titik_pengukuran")
            BBtxt_24_Titik_pengukuran.Range.Select
            wrdobject.Selection.TypeText Text:="" & rs!Titik_pengukuran_kalibrasi
        End If

           '25 # keterangan
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_25_Keterangan") = True Then
            Set BBtxt_25_Keterangan = wrdobject.ActiveDocument.Bookmarks("txt_25_Keterangan")
            BBtxt_25_Keterangan.Range.Select
            wrdobject.Selection.TypeText Text:="" & rs!Keterangan
        End If


           '26 # ttd dept MGR bagian
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_26_TTd_Mgr_bagian") = True Then
            Set BBtxt_26_TTd_Mgr_bagian = wrdobject.ActiveDocument.Bookmarks("txt_26_TTd_Mgr_bagian")
            BBtxt_26_TTd_Mgr_bagian.Range.Select
            wrdobject.Selection.TypeText Text:="" & rs!bagian
        End If

        '#################################### TTD only
        '27 # ttd pemohon 01
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_27_TTd_Pemohon01") = True Then
            Set BBtxt_27_TTd_Pemohon01 = wrdobject.ActiveDocument.Bookmarks("txt_27_TTd_Pemohon01")
            BBtxt_27_TTd_Pemohon01.Range.Select
            wrdobject.Selection.TypeText Text:="" & Get_EmployeeName("" & rs!pemohon)
        End If


        '27 # ttd pemohon 02
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_27_TTd_Pemohon02") = True Then
            Set BBtxt_27_TTd_Pemohon02 = wrdobject.ActiveDocument.Bookmarks("txt_27_TTd_Pemohon02")
            BBtxt_27_TTd_Pemohon02.Range.Select
            wrdobject.Selection.TypeText Text:=" "
        End If



        '27 # ttd pemohon 03
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_27_TTd_Pemohon03") = True Then
            Set BBtxt_27_TTd_Pemohon03 = wrdobject.ActiveDocument.Bookmarks("txt_27_TTd_Pemohon03")
            BBtxt_27_TTd_Pemohon03.Range.Select
            wrdobject.Selection.TypeText Text:="" & rs!Pemohon_Date
        End If




        '#######################
        '28 # ttd Mgr bagian 01
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_28_TTd_Mgr_Dept01") = True Then
            Set BBtxt_28_TTd_Mgr_Dept01 = wrdobject.ActiveDocument.Bookmarks("txt_28_TTd_Mgr_Dept01")
            BBtxt_28_TTd_Mgr_Dept01.Range.Select
            wrdobject.Selection.TypeText Text:="" & rs!Mgr_Dept_UID
        End If

        '28 # ttd Mgr bagian 02
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_28_TTd_Mgr_Dept02") = True Then
            Set BBtxt_28_TTd_Mgr_Dept02 = wrdobject.ActiveDocument.Bookmarks("txt_28_TTd_Mgr_Dept02")
            BBtxt_28_TTd_Mgr_Dept02.Range.Select
            wrdobject.Selection.TypeText Text:="" & rs!Mgr_Dept_Delegated
        End If

        '28 # ttd Mgr bagian 03
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_28_TTd_Mgr_Dept03") = True Then
            Set BBtxt_28_TTd_Mgr_Dept03 = wrdobject.ActiveDocument.Bookmarks("txt_28_TTd_Mgr_Dept03")
            BBtxt_28_TTd_Mgr_Dept03.Range.Select
            wrdobject.Selection.TypeText Text:="" & rs!Mgr_Dept_Date
        End If



        '#######################
        '29 # ttd Mgr bagian 01
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_29_TTd_Mgr_QA01") = True Then
            Set BBtxt_29_TTd_Mgr_QA01 = wrdobject.ActiveDocument.Bookmarks("txt_29_TTd_Mgr_QA01")
            BBtxt_29_TTd_Mgr_QA01.Range.Select
            wrdobject.Selection.TypeText Text:="" & rs!Mgr_QA_UID
        End If

        '29 # ttd Mgr bagian 02
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_29_TTd_Mgr_QA02") = True Then
            Set BBtxt_29_TTd_Mgr_QA02 = wrdobject.ActiveDocument.Bookmarks("txt_29_TTd_Mgr_QA02")
            BBtxt_29_TTd_Mgr_QA02.Range.Select
            wrdobject.Selection.TypeText Text:="" & rs!Mgr_QA_Delegated
        End If

        '29 # ttd Mgr bagian 03
        If wrdobject.ActiveDocument.Bookmarks.Exists("txt_29_TTd_Mgr_QA03") = True Then
            Set BBtxt_29_TTd_Mgr_QA03 = wrdobject.ActiveDocument.Bookmarks("txt_29_TTd_Mgr_QA03")
            BBtxt_29_TTd_Mgr_QA03.Range.Select
            wrdobject.Selection.TypeText Text:="" & rs!Mgr_QA_Date
        End If



        'BBtxt_27_TTd_Pemohon01







'         If wrdobject.ActiveDocument.Bookmarks.Exists("txt_14B_chk_Rekalibrasi") = True Then
'            Set BBtxt_14B_chk_Rekalibrasi = wrdobject.ActiveDocument.Bookmarks("txt_14B_chk_Rekalibrasi")
'            BBtxt_14B_chk_Rekalibrasi.Range.Select
'            wrdobject.Selection.TypeText Text:=Chr(254)
'        End If



    wrdobject.Application.Activate
    Set wrdobject = Nothing

    MsgBox ("Success Export File"), vbInformation, Default_Message_Title
    Form_Load
    Exit Sub
onError:
    wrdobject.Quit (False)
    Set wrdobject = Nothing
    MsgBox ("Aktifitas export tidak dapat dilakukan, Silahkan Restart program.")
End Sub





Function fnApprIdentity(ByRef VAppr_Id As String, ByRef vAppr_No As String) As String

    Dim rs As Recordset, sql As String
    Dim vvAppr_ApplicationCode As String
    vvAppr_ApplicationCode = "KAL_Permohonan" 'set approval lines nya

    sql = "select Appr_Identity from m_approver_lines where isactive = 1 and Appr_ApplicationCode LIKE '" & vvAppr_ApplicationCode & "' and Appr_ID = '" & VAppr_Id & "' and Appr_No = '" & vAppr_No & "' "
    Set rs = GetRecordset(sql)
    If rs.RecordCount = 0 Then
        fnApprIdentity = 0
    Else
        fnApprIdentity = "" & rs!Appr_Identity
    End If
End Function


Function fnUploadFile(ByRef fileNewName As String) As Boolean
    On Error GoTo Err


  '1# mulai upload data ############################################################
  Dim Inet1 As Object
  Set Inet1 = CreateObject("InetCtls.Inet")
  Dim fileSources As String, fileExt As String, I As Integer, strNewName As String
  strNewName = Replace(fileNewName, "/", "_")
                 '---####
  If txt_file_Ori.Text = "" Then
    fnUploadFile = False
    Exit Function
  End If
  fileSources = txt_file_Ori.Text

  fileExt = Right(fileSources, 5)
  I = InStr(1, fileExt, ".")
  fileExt = Right(fileExt, Len(fileExt) - I)

   Inet1.AccessType = icDirect
   Inet1.url = ftp_URL
   On Error GoTo Err
   Inet1.username = ftp_UID
   Inet1.password = ftp_PWD

   Inet1.RequestTimeout = 3600


   Inet1.Execute , "PUT " & """" & fileSources & """" & " " & """" & ftp_subFolder & "\" & strNewName & "." & fileExt & """"
   On Error GoTo Err
   Do While Inet1.StillExecuting
      DoEvents
      On Error GoTo Err
   Loop

   Inet1.Execute , "CLOSE"

   '----> Finish Upload
   txt_file_Ori.Text = ""
   f_GMP1_dlg.filename = ""


  fnUploadFile = True
  Exit Function

Err:
  fnUploadFile = False



End Function

Sub sbFill_FileDownload()
    Dim rs As Recordset, sql As String
    sql = "select top 1 isnull(FILE_NAME,'') as fileNama from T_Kalibrasi_Permohonan where No_Permohonan = '" & txt_No_permohonan.Text & "'"
    Set rs = GetRecordset(sql)
    If rs.EOF = False Then
        txt_file_download.Text = "" & rs!fileNama
    End If
End Sub


Function fnGetExtentionFile() As String
  Dim fileSources As String, fileExt As String
  fileSources = txt_file_Ori.Text

  fileExt = Right(fileSources, 5)
  I = InStr(1, fileExt, ".")
  fileExt = Right(fileExt, Len(fileExt) - I)
  fnGetExtentionFile = fileExt
End Function




Sub CheckFileExists(ByRef filesss As String)

Dim strFileName As String
Dim strFileExists As String

    strFileName = filesss
    strFileExists = Dir(strFileName)

   If strFileExists = "" Then
        'MsgBox "The selected file doesn't exist"
    Else
        filedelete (filesss)
    End If

End Sub




Private Sub filedelete(filename As String)
    Dim filesystemobject As Object
    Set filesystemobject = CreateObject("Scripting.filesystemobject")
    filesystemobject.deletefile filename, True
End Sub

